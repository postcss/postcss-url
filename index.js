/**
 * Module dependencies.
 */
var fs = require("fs")
var path = require("path")
var reduceFunctionCall = require("reduce-function-call")
var base64 = require("js-base64").Base64
var mime = require("mime")

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

    styles.eachDecl(function checkUrl(decl) {
      if (!decl.value) {
        return
      }

      if (decl.value.indexOf("url(") > -1) {
        var dirname = path.dirname(decl.source.file)
        decl.value = reduceFunctionCall(decl.value, "url", function(value) {
          // save quote style
          var quote = getQuote(value)
          value = unquote(value, quote)

          // ignore absolute url
          if (value.indexOf("/") === 0) {
            return value
          }

          var newPath = value

          if (mode === "rebase") {
            if (dirname !== from) {
              newPath = path.relative(from, dirname + path.sep + newPath)
            }
            newPath = path.resolve(from, newPath)
            newPath = path.relative(to, newPath)
            if (path.sep == "\\") {
              newPath = newPath.replace(/\\/g, "\/");
            }
          }
          else if (mode === "inline") {
            var file = path.resolve(from, dirname !== from ? dirname + path.sep + value : value)
            if (!fs.existsSync(file)) {
              console.warn("Can't read file '" + file + "', ignoring")
            }
            else {
              var mimeType = mime.lookup(file)
              if (!mimeType) {
                console.warn("Unable to find asset mime-type for " + file)
              }
              else {
                file = fs.readFileSync(file).toString()
                newPath = "data:" + mimeType + ";base64," + base64.encode(file)
              }
            }
          }
          else {
            throw new Error("Unknow mode for postcss-url: " + mode)
          }

          return "url(" + quote + newPath + quote + ")"
        })
      }
    })
  }
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
