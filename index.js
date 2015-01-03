/**
 * Module dependencies.
 */
var fs = require("fs")
var path = require("path")
var base64 = require("js-base64").Base64
var mime = require("mime")
var reduceFunctionCall = require("reduce-function-call");

/**
 * Fix url() according to source (`from`) or destination (`to`)
 *
 * @param {Object} options
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
 * Processes one delcaration
 *
 * @param {Object} decl
 * @param {String} from
 * @param {String} to
 * @param {String|Function} mode
 * @param {Object} options
 */
function processDecl(decl, from, to, mode, options) {
  if (decl.fallback) {
    return;
  }
  var dirname = path.dirname(decl.source.file)
  var fallbackDecl = false;
  decl.value = reduceFunctionCall(decl.value, "url", function(value) {
    // save quote style
    var quote = getQuote(value)
    value = unquote(value, quote)

    if (typeof mode === "function") {
      return processCustom(quote, value, mode);
    }

    // ignore absolute urls or data uris
    if (/^(?:[a-z]+:\/|data:.*)?\//.test(value)) {
      return createUrl(quote, value)
    }

    var newPath = value

    switch (mode) {
    case "rebase":
      return processRebase(from, dirname, newPath, quote, to)
      break
    case "inline":
      fallbackDecl = options.fallback ? decl.clone() : false
      return processInline(from, dirname, newPath, quote, value, options)
      break
    default:
      throw new Error("Unknow mode for postcss-url: " + mode)
      break
    }
  })

  if (fallbackDecl) {
    fallbackDecl.fallback = true;
    decl.parent.append(fallbackDecl)
  }
}


/**
 * Transform url() based on a custom callback
 *
 * @param {String} quote
 * @param {String} value
 * @param {Function} cb
 */
function processCustom(quote, value, cb) {
  var newValue = cb(value)
  return createUrl(quote, newValue)
}


/**
 * Fix url() according to source (`from`) or destination (`to`)
 *
 * @param {String} from
 * @param {String} dirname
 * @param {String} newPath
 * @param {String} quote
 * @param {String} to
 */
function processRebase(from, dirname, newPath, quote, to) {
  if (dirname !== from) {
    newPath = path.relative(from, dirname + path.sep + newPath)
  }
  newPath = path.resolve(from, newPath)
  newPath = path.relative(to, newPath)
  if (path.sep == "\\") {
    newPath = newPath.replace(/\\/g, "\/");
  }
  return createUrl(quote, newPath);
}

/**
 * Inline image in url()
 *
 * @param {String} from
 * @param {String} dirname
 * @param {String} newPath
 * @param {String} quote
 * @param {String} value
 * @param {Object} options
 */
function processInline(from, dirname, newPath, quote, value, options) {
  var maxSize = typeof(options.maxSize) == "undefined" ? 14 : options.maxSize
  var basePath = options.basePath;
  var fullFilePath;
  maxSize *= 1024;
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
    var stats = fs.statSync(file);
    if (stats.size >= maxSize) {
      return createUrl(quote, newPath)
    }
    if (!mimeType) {
      console.warn("Unable to find asset mime-type for " + file)
    }
    else {
      file = fs.readFileSync(file)
      newPath = "data:" + mimeType + ";base64," + base64.encode(file)
    }
  }
  return createUrl(quote, newPath)
}

function createUrl(quote, newPath) {
  return "url(" + quote + newPath + quote + ")"
}

/**
 * remove quote around a string
 *
 * @param  {String} string
 * @param  {String} quote
 * @return {String}        unquoted string
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
 * @return {String}        quote if any, or empty string
 */
function getQuote(string) {
  var quote = ""
  Array("\"", "'").forEach(function(q) {
    if (string.charAt(0) === q && string.charAt(string.length - 1) === q) {
      quote = q
    }
  })

  return quote
}
