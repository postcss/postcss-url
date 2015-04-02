/**
 * Module dependencies.
 */
var fs = require("fs")
var path = require("path")
var mime = require("mime")
var url = require("url")
var SvgEncoder = require("directory-encoder/lib/svg-uri-encoder.js")
var reduceFunctionCall = require("reduce-function-call")

/**
 * Fix url() according to source (`from`) or destination (`to`)
 *
 * @param {Object} options plugin options
 * @return {void}
 */
module.exports = function fixUrl(options) {
  options = options || {}
  var mode = options.url !== undefined ? options.url : "rebase"

  return function(styles, postcssOptions) {
    var from = postcssOptions.opts.from ? path.dirname(postcssOptions.opts.from) : "."
    var to = postcssOptions.opts.to ? path.dirname(postcssOptions.opts.to) : from

    styles.eachDecl(function(decl) {
      if (decl.value && decl.value.indexOf("url(") > -1) {
        processDecl(decl, from, to, mode, options)
      }
    })
  }
}

/**
 * return quote type
 *
 * @param  {String} string quoted (or not) value
 * @return {String} quote if any, or empty string
 */
function getUrlMetaData(string) {
  var quote = ""
  var quotes = ["\"", "'"]
  var trimedString = string.trim()
  quotes.forEach(function(q) {
    if (trimedString.charAt(0) === q && trimedString.charAt(trimedString.length - 1) === q) {
      quote = q
    }
  })

  var urlMeta = {
    before: string.slice(0, string.indexOf(quote)),
    quote: quote,
    value: quote ? trimedString.substr(1, trimedString.length - 2) : trimedString,
    after: string.slice(string.lastIndexOf(quote) + 1),
  }
  return urlMeta
}

/**
 * Create an css url() from a path and a quote style
 *
 * @param {String} urlMeta url meta data
 * @param {String} newPath url path
 * @return {String} new url()
 */
function createUrl(urlMeta, newPath) {
  return "url(" +
    urlMeta.before +
    urlMeta.quote +
    (newPath || urlMeta.value) +
    urlMeta.quote +
    urlMeta.after +
  ")"
}

/**
 * Processes one declaration
 *
 * @param {Object} decl postcss declaration
 * @param {String} from source
 * @param {String} to destination
 * @param {String|Function} mode plugin mode
 * @param {Object} options plugin options
 * @return {void}
 */
function processDecl(decl, from, to, mode, options) {
  var dirname = decl.source && decl.source.input ? path.dirname(decl.source.input.file) : process.cwd()
  decl.value = reduceFunctionCall(decl.value, "url", function(value) {
    var urlMeta = getUrlMetaData(value)

    if (typeof mode === "function") {
      return processCustom(urlMeta, mode, decl)
    }

    // ignore absolute urls, hasshes or data uris
    if (urlMeta.value.indexOf("/") === 0 ||
        urlMeta.value.indexOf("data:") === 0 ||
        urlMeta.value.indexOf("#") === 0 ||
        /^[a-z]+:\/\//.test(urlMeta.value)
    ) {
      return createUrl(urlMeta)
    }

    switch (mode) {
    case "rebase":
      return processRebase(from, dirname, urlMeta, to)
    case "inline":
      return processInline(from, dirname, urlMeta, options)
    default:
      throw new Error("Unknow mode for postcss-url: " + mode)
    }
  })
}

/**
 * Transform url() based on a custom callback
 *
 * @param {String} urlMeta url meta datayy
 * @param {Function} cb callback to execute
 * @param {Object} decl postcss declaration
 * @return {void}
 */
function processCustom(urlMeta, cb, decl) {
  var newValue = cb(urlMeta.value, decl)
  return createUrl(urlMeta, newValue)
}


/**
 * Fix url() according to source (`from`) or destination (`to`)
 *
 * @param {String} from from
 * @param {String} dirname to dirname
 * @param {String} urlMeta url meta datayy
 * @param {String} to destination
 * @return {String} new url
 */
function processRebase(from, dirname, urlMeta, to) {
  var newPath = urlMeta.value
  if (dirname !== from) {
    newPath = path.relative(from, dirname + path.sep + newPath)
  }
  newPath = path.resolve(from, newPath)
  newPath = path.relative(to, newPath)
  if (path.sep === "\\") {
    newPath = newPath.replace(/\\/g, "\/")
  }
  return createUrl(urlMeta, newPath)
}

/**
 * Inline image in url()
 *
 * @param {String} from from
 * @param {String} dirname to dirname
 * @param {String} urlMeta url meta data
 * @param {Object} options plugin options
 * @return {String} new url
 */
function processInline(from, dirname, urlMeta, options) {
  var maxSize = options.maxSize === undefined ? 14 : options.maxSize
  var basePath = options.basePath
  var fullFilePath
  maxSize *= 1024

  // ignore URLs with hashes/fragments, they can't be inlined
  var link = url.parse(urlMeta.value)
  if (link.hash) {
    return createUrl(urlMeta, urlMeta.value)
  }

  if (basePath) {
    fullFilePath = path.join(basePath, urlMeta.value)
  }
  else {
    fullFilePath = dirname !== from ? dirname + path.sep + urlMeta.value : urlMeta.value
  }

  var file = path.resolve(from, fullFilePath)
  if (!fs.existsSync(file)) {
    console.warn("Can't read file '" + file + "', ignoring")
    return createUrl(urlMeta)
  }

  var mimeType = mime.lookup(file)
  var stats = fs.statSync(file)

  if (stats.size >= maxSize) {
    return createUrl(urlMeta)
  }

  if (!mimeType) {
    console.warn("Unable to find asset mime-type for " + file)
    return createUrl(urlMeta)
  }

  if (mimeType === "image/svg+xml") {
    var svg = new SvgEncoder(file)
    return createUrl(urlMeta, svg.encode())
  }

  // else
  file = fs.readFileSync(file)
  return createUrl(urlMeta, "data:" + mimeType + ";base64," + file.toString("base64"))
}

