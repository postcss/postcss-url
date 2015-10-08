/**
 * Module dependencies.
 */
var fs = require("fs")
var path = require("path")

var postcss = require("postcss")
var mime = require("mime")
var url = require("url")
var SvgEncoder = require("directory-encoder/lib/svg-uri-encoder.js")
var reduceFunctionCall = require("reduce-function-call")
var mkdirp = require("mkdirp")
var crypto = require("crypto")
var pathIsAbsolute = require("path-is-absolute")

/**
 * Fix url() according to source (`from`) or destination (`to`)
 *
 * @param {Object} options plugin options
 * @return {void}
 */
module.exports = postcss.plugin(
  "postcss-url",
  function fixUrl(options) {
    options = options || {}
    var mode = options.url !== undefined ? options.url : "rebase"
    var isCustom = typeof mode === "function"
    var callback = isCustom ? getCustomProcessor(mode) : getUrlProcessor(mode)

    return function(styles, result) {
      var from = result.opts.from
        ? path.dirname(result.opts.from)
        : "."
      var to = result.opts.to
        ? path.dirname(result.opts.to)
        : from

      var cb = getDeclProcessor(result, from, to, callback, options, isCustom)

      styles.walkDecls(cb)
    }
  }
)

/**
 * @callback PostcssUrl~UrlProcessor
 * @param {String} from from
 * @param {String} dirname to dirname
 * @param {String} urlMeta url meta data
 * @param {String} to destination
 * @param {Object} options plugin options
 * @param {Object} decl postcss declaration
 * @return {String|undefined} new url or undefined if url is old
 */

/**
 * @param {String} mode
 * @returns {PostcssUrl~UrlProcessor}
 */
function getUrlProcessor(mode) {
  switch (mode) {
  case "rebase":
    return processRebase
  case "inline":
    return processInline
  case "copy":
    return processCopy
  default:
    throw new Error("Unknow mode for postcss-url: " + mode)
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
    if (
      trimedString.charAt(0) === q &&
      trimedString.charAt(trimedString.length - 1) === q
    ) {
      quote = q
    }
  })

  var urlMeta = {
    before: string.slice(0, string.indexOf(quote)),
    quote: quote,
    value: quote
      ? trimedString.substr(1, trimedString.length - 2)
      : trimedString,
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
 * @callback PostcssUrl~DeclProcessor
 * @param {Object} decl declaration
 */

/**
 * @param {Object} result
 * @param {String} from from
 * @param {String} to destination
 * @param {PostcssUrl~UrlProcessor} callback
 * @param {Object} options
 * @param {Boolean} [isCustom]
 * @returns {PostcssUrl~DeclProcessor}
 */
function getDeclProcessor(result, from, to, callback, options, isCustom) {
  var valueCallback = function(decl, value) {
    var dirname = decl.source && decl.source.input
      ? path.dirname(decl.source.input.file)
      : process.cwd()

    var urlMeta = getUrlMetaData(value)
    var newValue

    if (isCustom || ! isUrlShouldBeIgnored(urlMeta.value)) {
      newValue = callback(result, from, dirname, urlMeta, to, options, decl)
    }

    return createUrl(urlMeta, newValue)
  }

  return function(decl) {
    if (decl.value && decl.value.indexOf("url(") > -1) {
      decl.value = reduceFunctionCall(decl.value, "url", function(value) {
        return valueCallback(decl, value)
      })
    }
  }
}

/**
 * Check if url is absolute, hash or data-uri
 * @param {String} url
 * @returns {boolean}
 */
function isUrlShouldBeIgnored(url) {
  return url[0] === "/" ||
    url[0] === "#" ||
    url.indexOf("data:") === 0 ||
    /^[a-z]+:\/\//.test(url)
}

/**
 * Transform url() based on a custom callback
 *
 * @param {Function} cb callback function
 * @return {PostcssUrl~UrlProcessor}
 */
function getCustomProcessor(cb) {
  return function(result, from, dirname, urlMeta, to, options, decl) {
    return cb(urlMeta.value, decl, from, dirname, to, options, result)
  }
}

/**
 * Fix url() according to source (`from`) or destination (`to`)
 *
 * @type {PostcssUrl~UrlProcessor}
 */
function processRebase(result, from, dirname, urlMeta, to) {
  var newPath = urlMeta.value
  if (dirname !== from) {
    newPath = path.relative(from, dirname + path.sep + newPath)
  }
  newPath = path.resolve(from, newPath)
  newPath = path.relative(to, newPath)
  if (path.sep === "\\") {
    newPath = newPath.replace(/\\/g, "\/")
  }
  return newPath
}

/**
 * Inline image in url()
 *
 * @type {PostcssUrl~UrlProcessor}
 */
function processInline(result, from, dirname, urlMeta, to, options, decl) {
  var maxSize = options.maxSize === undefined ? 14 : options.maxSize
  var fallback = options.fallback
  var basePath = options.basePath
  var fullFilePath

  maxSize *= 1024

  function processFallback() {
    if (typeof fallback === "function") {
      return getCustomProcessor(fallback)
        (result, from, dirname, urlMeta, to, options, decl)
    }
    switch (fallback) {
    case "copy":
      return processCopy(result, from, dirname, urlMeta, to, options, decl)
    default:
      return
    }
  }

  // ignore URLs with hashes/fragments, they can't be inlined
  var link = url.parse(urlMeta.value)
  if (link.hash) {
    return processFallback()
  }

  if (basePath) {
    fullFilePath = path.join(basePath, link.pathname)
  }
  else {
    fullFilePath = dirname !== from
      ? dirname + path.sep + link.pathname
      : link.pathname
  }

  var file = path.resolve(from, fullFilePath)
  if (!fs.existsSync(file)) {
    result.warn("Can't read file '" + file + "', ignoring", {node: decl})
    return
  }

  var stats = fs.statSync(file)

  if (stats.size >= maxSize) {
    return processFallback()
  }

  var mimeType = mime.lookup(file)

  if (!mimeType) {
    result.warn("Unable to find asset mime-type for " + file, {node: decl})
    return
  }

  if (mimeType === "image/svg+xml") {
    var svg = new SvgEncoder(file)
    return svg.encode()
  }

  // else
  file = fs.readFileSync(file)
  return "data:" + mimeType + ";base64," + file.toString("base64")
}

/**
 * Copy images from readed from url() to an specific assets destination
 * (`assetsPath`) and fix url() according to that path.
 * You can rename the assets by a hash or keep the real filename.
 *
 * Option assetsPath is require and is relative to the css destination (`to`)
 *
 * @type {PostcssUrl~UrlProcessor}
 */
function processCopy(result, from, dirname, urlMeta, to, options, decl) {
  if (from === to) {
    result.warn("Option `to` of postcss is required, ignoring", {node: decl})
    return
  }
  var relativeAssetsPath = (options && options.assetsPath)
    ? options.assetsPath
    : ""
  var absoluteAssetsPath

  var filePathUrl = path.resolve(dirname, urlMeta.value)
  var nameUrl = path.basename(filePathUrl)

  // remove hash or parameters in the url.
  // e.g., url('glyphicons-halflings-regular.eot?#iefix')
  var fileLink = url.parse(urlMeta.value)
  var filePath = path.resolve(dirname, fileLink.pathname)
  var name = path.basename(filePath)
  var useHash = options.useHash || false

  // check if the file exist in the source
  try {
    var contents = fs.readFileSync(filePath)
  }
  catch (err) {
    result.warn("Can't read file '" + filePath + "', ignoring", {node: decl})
    return
  }

  if (useHash) {

    absoluteAssetsPath = path.resolve(to, relativeAssetsPath)

    // create the destination directory if it not exist
    mkdirp.sync(absoluteAssetsPath)

    name = crypto.createHash("sha1")
      .update(contents)
      .digest("hex")
      .substr(0, 16)
    name += path.extname(filePath)
    nameUrl = name + (fileLink.search || "") + (fileLink.hash || "")
  }
  else {
    if (!pathIsAbsolute.posix(from)) {
      from = path.resolve(from)
    }
    relativeAssetsPath = path.join(
      relativeAssetsPath,
      dirname.replace(new RegExp(from.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
                                 + "[\/]\?"), ""),
      path.dirname(urlMeta.value)
    )
    absoluteAssetsPath = path.resolve(to, relativeAssetsPath)

    // create the destination directory if it not exist
    mkdirp.sync(absoluteAssetsPath)
  }

  absoluteAssetsPath = path.join(absoluteAssetsPath, name)

  // if the file don't exist in the destination, create it.
  try {
    fs.accessSync(absoluteAssetsPath)
  }
  catch (err) {
    fs.writeFileSync(absoluteAssetsPath, contents)
  }

  var assetPath = path.join(relativeAssetsPath, nameUrl)
  if (path.sep === "\\") {
    assetPath = assetPath.replace(/\\/g, "\/")
  }  
  return assetPath
}
