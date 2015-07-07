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

    return function(styles, result) {
      var from = result.opts.from
        ? path.dirname(result.opts.from)
        : "."
      var to = result.opts.to
        ? path.dirname(result.opts.to)
        : from

      styles.eachDecl(function(decl) {
        if (decl.value && decl.value.indexOf("url(") > -1) {
          processDecl(result, decl, from, to, mode, options)
        }
      })
    }
  }
)

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
 * Processes one declaration
 *
 * @param {Object} decl postcss declaration
 * @param {String} from source
 * @param {String} to destination
 * @param {String|Function} mode plugin mode
 * @param {Object} options plugin options
 * @return {void}
 */
function processDecl(result, decl, from, to, mode, options) {
  var dirname = decl.source && decl.source.input
    ? path.dirname(decl.source.input.file)
    : process.cwd()
  decl.value = reduceFunctionCall(decl.value, "url", function(value) {
    var urlMeta = getUrlMetaData(value)

    if (typeof mode === "function") {
      return processCustom(
        result,
        mode,
        from,
        dirname,
        urlMeta,
        to,
        options,
        decl
      )
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
      return processRebase(result, from, dirname, urlMeta, to)
    case "inline":
      return processInline(result, from, dirname, urlMeta, to, options, decl)
    case "copy":
      return processCopy(result, from, dirname, urlMeta, to, options, decl)
    default:
      throw new Error("Unknow mode for postcss-url: " + mode)
    }
  })
}

/**
 * Transform url() based on a custom callback
 *
 * @param {Function} cb callback function
 * @param {String} from from
 * @param {String} dirname to dirname
 * @param {String} urlMeta url meta data
 * @param {String} to destination
 * @param {Object} options plugin options
 * @param {Object} decl postcss declaration
 * @return {void}
 */
function processCustom(result, cb, from, dirname, urlMeta, to, options, decl) {
  var newValue = cb(urlMeta.value, decl, from, dirname, to, options, result)
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
  return createUrl(urlMeta, newPath)
}

/**
 * Inline image in url()
 *
 * @param {String} from from
 * @param {String} dirname to dirname
 * @param {String} urlMeta url meta data
 * @param {String} to destination
 * @param {Object} options plugin options
 * @param {Object} decl postcss declaration
 * @return {String} new url
 */
function processInline(result, from, dirname, urlMeta, to, options, decl) {
  var maxSize = options.maxSize === undefined ? 14 : options.maxSize
  var fallback = options.fallback
  var basePath = options.basePath
  var fullFilePath

  maxSize *= 1024

  function processFallback() {
    if (typeof fallback === "function") {
      return processCustom(
        result,
        fallback,
        from,
        dirname,
        urlMeta,
        to,
        options,
        decl
      )
    }
    switch (fallback) {
    case "copy":
      return processCopy(result, from, dirname, urlMeta, to, options, decl)
    default:
      return createUrl(urlMeta)
    }
  }

  // ignore URLs with hashes/fragments, they can't be inlined
  var link = url.parse(urlMeta.value)
  if (link.hash) {
    return processFallback()
  }

  if (basePath) {
    fullFilePath = path.join(basePath, urlMeta.value)
  }
  else {
    fullFilePath = dirname !== from
      ? dirname + path.sep + urlMeta.value
      : urlMeta.value
  }

  var file = path.resolve(from, fullFilePath)
  if (!fs.existsSync(file)) {
    result.warn("Can't read file '" + file + "', ignoring", {node: decl})
    return createUrl(urlMeta)
  }

  var mimeType = mime.lookup(file)
  var stats = fs.statSync(file)

  if (stats.size >= maxSize) {
    return processFallback()
  }

  if (!mimeType) {
    result.warn("Unable to find asset mime-type for " + file, {node: decl})
    return createUrl(urlMeta)
  }

  if (mimeType === "image/svg+xml") {
    var svg = new SvgEncoder(file)
    return createUrl(urlMeta, svg.encode())
  }

  // else
  file = fs.readFileSync(file)
  return createUrl(
    urlMeta,
    "data:" + mimeType + ";base64," + file.toString("base64")
  )
}

/**
 * Copy images read from url() to an specific assets destination
 * (`assetsPath`) and fix url() according to that path.
 * You can rename the assets by a hash or keep the real pathname.
 *
 * @param {String} from from
 * @param {String} dirname to dirname
 * @param {String} urlMeta url meta data
 * @param {String} to destination
 * @param {Object} options plugin options
 * @return {String} new url
 */
function processCopy(result, from, dirname, urlMeta, to, options, decl) {
  if (from === to) {
    result.warn("Option `to` of postscss is required, ignoring", {node: decl})
    return createUrl(urlMeta)
  }

  // i get the old base path of the asset
  var oldAbsolutePath = urlMeta.value
  if (dirname !== from) {
    oldAbsolutePath = path.relative(
      from,
      dirname + path.sep + oldAbsolutePath
    )
  }
  oldAbsolutePath = path.resolve(from, oldAbsolutePath)
  from = path.resolve(from)
  to = path.resolve(to)

  // parse url to get some information like the #hash of the url
  var parseUrl = url.parse(oldAbsolutePath, true)
  parseUrl.name = path.basename(parseUrl.pathname)
  parseUrl.extension = path.extname(parseUrl.pathname)

  // the absolute path without the #hash param
  oldAbsolutePath = parseUrl.pathname

  var assetsPath = (options && options.assetsPath)
    ? options.assetsPath
    : ""

  // define the basic information of the new path (relative and absolute)
  var prePathFrom = definePrePath(from, to)
  var newAbsolutePath = ""
  var newRelativePath = ""

  // check if the file exist in the source
  try {
    var contents = fs.readFileSync(parseUrl.pathname)
  }
  catch (err) {
    result.warn("Can't read file '" +
      parseUrl.pathname + "', ignoring",
      {node: decl})
    return createUrl(urlMeta)
  }

  if (options.useHash) {
    // i create a hash based on the content of the file
    parseUrl.name = crypto.createHash("sha1")
      .update(contents)
      .digest("hex")
      .substr(0, 16)

    parseUrl.name += parseUrl.extension
    newAbsolutePath = path.join(to, assetsPath, parseUrl.name)
  }
  else {
    newAbsolutePath = oldAbsolutePath
      .replace(prePathFrom, path.join(to, assetsPath))
  }

  // create the destination directory if it not exist
  mkdirp.sync(path.dirname(newAbsolutePath))

  newRelativePath = path
    .relative(from.replace(prePathFrom, to), newAbsolutePath)

  // if the file don't exist in the destination, create it.
  try {
    fs.accessSync(newAbsolutePath)
  }
  catch (err) {
    fs.writeFileSync(newAbsolutePath, contents)
  }

  // add the hash or search attribute took from the url.
  // e.g., url('glyphicons-halflings-regular.eot?#iefix')
  var finalUrlName = parseUrl.name +
    (parseUrl.search ? parseUrl.search : "") +
    (parseUrl.hash ? parseUrl.hash : "")

  finalUrlName = path.join(
    path.dirname(newRelativePath),
    finalUrlName
  )

  return createUrl(urlMeta, finalUrlName)
}

/**
 * Define the shared path between `from` and `to`
 * e.g
 * 	from: 'project/app/src/pageOne/images'
 * 	to: 'project/app/dist'
 * Soo the pre path shared is:
 *  project/app (with one level more)
 * Soo the final path structure must be:
 *  project/app/dist/pageOne/images
 * @param  {String} from
 * @param  {String} to
 * @return {String} prePath
 */
function definePrePath(from, to) {
  var preFromPath = from.split(path.sep)

  var preToPath = to.split(path.sep)
  var prePath = []
  var finishSearch = false
  var i = 0

  while ((i < preFromPath.length) && !(finishSearch)) {
    if ((preToPath[i] === undefined) ||
        (preToPath[i] !== preToPath[i])) {
      finishSearch = true
    }
    else {
      prePath.push(preFromPath[i])
    }
    i++
  }

  if (prePath.length > 0) {
    prePath = prePath.join(path.sep)
  }
  else {
    prePath = ""
  }

  return prePath
}
