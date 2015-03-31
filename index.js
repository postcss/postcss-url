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
    var from = postcssOptions.from ? path.dirname(postcssOptions.from) : "."
    var to = postcssOptions.to ? path.dirname(postcssOptions.to) : from

    styles.eachDecl(function(decl) {
      if (!decl.value) {
        return
      }

      if (decl.value.indexOf("url(") > -1) {
        processDecl(decl, from, to, mode, options)
      }
    })
  }
}

/**
 * remove quote around a string
 *
 * @param  {String} string string to unquote
 * @param  {String} quote quote style
 * @return {String} unquoted string
 */
function unquote(string, quote) {
  if (quote) {
    return string.substr(1, string.length - 2)
  }

  return string
}


/**
 * return quote type
 *
 * @param  {String} string quoted (or not) value
 * @return {String} quote if any, or empty string
 */
function getQuote(string) {
  var quote = ""
  var quotes = ["\"", "'"]
  quotes.forEach(function(q) {
    if (string.charAt(0) === q && string.charAt(string.length - 1) === q) {
      quote = q
    }
  })

  return quote
}

/**
 * Create an css url() from a path and a quote style
 *
 * @param {String} quote quote style
 * @param {String} newPath url path
 * @return {String} new url()
 */
function createUrl(quote, newPath) {
  return "url(" + quote + newPath + quote + ")"
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
    // save quote style
    var quote = getQuote(value)
    value = unquote(value, quote)

    if (typeof mode === "function") {
      return processCustom(quote, value, mode, decl)
    }

    // ignore absolute urls, hasshes or data uris
    if (value.indexOf("/") === 0 ||
        value.indexOf("data:") === 0 ||
        value.indexOf("#") === 0 ||
        /^[a-z]+:\/\//.test(value)
    ) {
      return createUrl(quote, value)
    }

    var newPath = value

    switch (mode) {
    case "rebase":
      return processRebase(from, dirname, newPath, quote, to)
    case "inline":
      return processInline(from, dirname, newPath, quote, value, options)
    default:
      throw new Error("Unknow mode for postcss-url: " + mode)
    }
  })
}

/**
 * Transform url() based on a custom callback
 *
 * @param {String} quote quote
 * @param {String} value value to process
 * @param {Function} cb callback to execute
 * @param {Object} decl postcss declaration
 * @return {void}
 */
function processCustom(quote, value, cb, decl) {
  var newValue = cb(value, decl)
  return createUrl(quote, newValue)
}


/**
 * Fix url() according to source (`from`) or destination (`to`)
 *
 * @param {String} from from
 * @param {String} dirname to dirname
 * @param {String} newPath to new path
 * @param {String} quote quote style
 * @param {String} to destination
 * @return {String} new url
 */
function processRebase(from, dirname, newPath, quote, to) {
  if (dirname !== from) {
    newPath = path.relative(from, dirname + path.sep + newPath)
  }
  newPath = path.resolve(from, newPath)
  newPath = path.relative(to, newPath)
  if (path.sep === "\\") {
    newPath = newPath.replace(/\\/g, "\/")
  }
  return createUrl(quote, newPath)
}

/**
 * Inline image in url()
 *
 * @param {String} from from
 * @param {String} dirname to dirname
 * @param {String} newPath to new path
 * @param {String} quote quote style
 * @param {String} value value to process
 * @param {Object} options plugin options
 * @return {String} new url
 */
function processInline(from, dirname, newPath, quote, value, options) {
  var maxSize = options.maxSize === undefined ? 14 : options.maxSize
  var basePath = options.basePath
  var fullFilePath
  maxSize *= 1024

  // ignore URLs with hashes/fragments, they can't be inlined
  var link = url.parse(value)
  if (link.hash) {
    return createUrl(quote, value)
  }

  if (basePath) {
    fullFilePath = path.join(basePath, value)
  }
  else {
    fullFilePath = dirname !== from ? dirname + path.sep + value : value
  }
  var file = path.resolve(from, fullFilePath)
  if (!fs.existsSync(file)) {
    console.warn("Can't read file '" + file + "', ignoring")
  }
  else {
    var mimeType = mime.lookup(file)
    var stats = fs.statSync(file)
    if (stats.size >= maxSize) {
      return createUrl(quote, newPath)
    }
    if (!mimeType) {
      console.warn("Unable to find asset mime-type for " + file)
    }
    else if (mimeType === "image/svg+xml") {
      var svg = new SvgEncoder(file)
      newPath = svg.encode()
    }
    else {
      file = fs.readFileSync(file)
      newPath = "data:" + mimeType + ";base64," + file.toString("base64")
    }
  }
  return createUrl(quote, newPath)
}

