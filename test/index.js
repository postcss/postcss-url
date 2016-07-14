var test = require("tape")

var fs = require("fs")

var url = require("..")
var postcss = require("postcss")

function read(name) {
  return fs.readFileSync("test/" + name + ".css", "utf8").trim()
}

function runPostcss(name, opts, postcssOpts, plugin) {
  opts = opts || {}
  var pcss = postcss()

  if (plugin) {
    pcss.use(plugin())
  }

  return pcss
    .use(url(opts))
    .process(read("fixtures/" + name), postcssOpts)
}

function testCssResult(t, test, name, msg, opts, postcssOpts, plugin) {
  t.test(msg, function(t) {
    runPostcss(name, opts, postcssOpts, plugin).then(function(result) {
      test(t, result.css)
    })
  })
}

function matchCssResult(t, regExp, name, msg, opts, postcssOpts, plugin) {
  testCssResult(t, function(t, css) {
    t.ok(css.match(regExp), "should match: " + regExp)
    t.end()
  }, name, msg, opts, postcssOpts, plugin)
}

function notMatchCssResult(t, regExp, name, msg, opts, postcssOpts, plugin) {
  testCssResult(t, function(t, css) {
    t.notOk(css.match(regExp), "should not match: " + regExp)
    t.end()
  }, name, msg, opts, postcssOpts, plugin)
}

function compareFixtures(t, name, msg, opts, postcssOpts, plugin) {
  testCssResult(t, function(t, actual) {
    var expected = read("fixtures/" + name + ".expected")

    // handy thing: checkout actual in the *.actual.css file
    fs.writeFile("test/fixtures/" + name + ".actual.css", actual)

    t.equal(actual, expected)
    t.end()
  }, name, msg, opts, postcssOpts, plugin)
}

test("rebase", function(t) {
  var opts = {}
  compareFixtures(
    t,
    "cant-rebase",
    "shouldn't rebase url if no info available")
  compareFixtures(
    t,
    "rebase-to-from",
    "should rebase url to dirname(from)",
    opts,
    { from: "test/fixtures/here" }
  )
  compareFixtures(
    t,
    "rebase-to-to-without-from",
    "should rebase url to dirname(to)",
    opts,
    { to: "there" }
  )
  compareFixtures(
    t,
    "rebase-to-to",
    "should rebase url to dirname(to) even if from given",
    opts,
    { from: "test/fixtures/here", to: "there" }
  )
  compareFixtures(
    t,
    "rebase-all-url-syntax",
    "should rebase url even if there is differentes types of quotes",
    opts,
    { from: "test/fixtures/here", to: "there" }
  )
  compareFixtures(
    t,
    "rebase-querystring-hash",
    "should rebase url that have query string or hash (or both)",
    opts,
    { from: "test/fixtures/here", to: "there" }
  )
  compareFixtures(
    t,
    "rebase-imported",
    "should rebase url of imported files",
    opts,
    { from: "test/fixtures/transform.css" }, require("postcss-import")
  )
  compareFixtures(
    t,
    "alpha-image-loader",
    "should rebase in filter",
    opts,
    { from: "test/fixtures/here", to: "there" }
  )

  t.end()
})

test("inline", function(t) {
  var opts = { url: "inline" }
  var postcssOpts = { from: "test/fixtures/here" }
  compareFixtures(
    t,
    "cant-inline",
    "shouldn't inline url if no info available", opts)

  compareFixtures(
    t,
    "cant-inline-hash",
    "shouldn't inline url if it has a hash in it", opts)

  matchCssResult(
    t,
    /;base64/,
    "inline-from",
    "should inline url from dirname(from)",
    opts, postcssOpts)

  notMatchCssResult(
    t,
    /;base64/,
    "inline-from",
    "should not inline big files from dirname(from)",
    { url: "inline", maxSize: 0 }, postcssOpts)

  notMatchCssResult(
    t,
    /;base64/,
    "inline-svg",
    "SVGs shouldn't be encoded in base64",
    opts, postcssOpts)

  matchCssResult(
    t,
    /;base64/,
    "inline-imported",
    "should inline url of imported files",
    opts, postcssOpts, require("postcss-import"))

  matchCssResult(
    t,
    /data\:image\/svg\+xml/,
    "inline-by-type",
    "should inline files matching the minimatch pattern",
    { url: "inline", filter: "**/*.svg" }, postcssOpts)

  notMatchCssResult(
    t,
    /data:image\/gif/,
    "inline-by-type",
    "shouldn't inline files not matching the minimatch pattern",
    { url: "inline", filter: "**/*.svg" }, postcssOpts)

  matchCssResult(
    t,
    /data\:image\/svg\+xml/,
    "inline-by-type",
    "should inline files matching the regular expression",
    { url: "inline", filter: /\.svg$/ }, postcssOpts)

  notMatchCssResult(
    t,
    /data:image\/gif/,
    "inline-by-type",
    "shouldn't inline files not matching the regular expression",
    { url: "inline", filter: /\.svg$/ }, postcssOpts)

  var customFilterFunction = function(filename) {
    return /\.svg$/.test(filename)
  }

  matchCssResult(
    t,
    /data\:image\/svg\+xml/,
    "inline-by-type",
    "should inline files based on custom filter function result",
    { url: "inline", filter: customFilterFunction }, postcssOpts)

  notMatchCssResult(
    t,
    /data\:image\/gif/,
    "inline-by-type",
    "shouldn't inline files rejected by custom filter function",
    { url: "inline", filter: customFilterFunction }, postcssOpts)

  t.end()
})

test("custom", function(t) {
  var declOk = false
  var opts = {
    url: function(URL, decl, from, dirname, to, options) {
      if (!declOk) {
        t.ok(decl,
            "should offer postcss decl as second parameter")
        t.equal(options, opts,
            "should offer plugin options as last parameter")
        declOk = true
      }
      return URL.toUpperCase()
    },
  }

  compareFixtures(
    t,
    "custom",
    "should transform url through custom callback", opts)

  t.end()
})

test("ignore absolute urls, data uris, or hashes", function(t) {
  compareFixtures(
    t,
    "absolute-urls",
    "shouldn't not transform absolute urls, hashes or data uris")

  t.end()
})

function testCopy(t, opts, postcssOpts) {
  var assetsPath = ""
  if (opts.assetsPath) {
    assetsPath = opts.assetsPath + "\/"
  }
  var patterns = {
    copyPixelPng:
      new RegExp("\"" + assetsPath + "imported\/pixel\.png\""),
    copyPixelGif:
      new RegExp("\"" + assetsPath + "pixel\\.gif\""),
    copyParamsPixelPngHash:
      new RegExp("\"" + assetsPath + "imported\/pixel\\.png\\?\#iefix\""),
    copyParamsPixelPngParam:
      new RegExp("\"" + assetsPath + "imported\/pixel\\.png\\?foo=bar\""),
    copyParamsPixelGif:
      new RegExp("\"" + assetsPath + "pixel\\.gif\\#el\""),
    copyHashPixel:
      new RegExp("\"" + assetsPath + "[a-z0-9]{16}\\.png\""),
    copyHashParamsPixel:
      new RegExp("\"" + assetsPath + "[a-z0-9]{16}\\.png\\?v=1\\.1\\#iefix\""),
  }

  testCssResult(
    t,
    function(t, css) {
      t.ok(
        css.match(patterns.copyPixelPng) &&
        css.match(patterns.copyPixelGif)
      )
      t.end()
    },
    "copy",
    "should copy asset from the source (`from`) to the assets destination " +
    "(`to` + `assetsPath`) and rebase the url",
    opts, postcssOpts)

  testCssResult(
    t,
    function(t, css) {
      t.ok(
        css.match(patterns.copyParamsPixelPngHash) &&
        css.match(patterns.copyParamsPixelPngParam) &&
        css.match(patterns.copyParamsPixelGif)
      )
      t.end()
    },
    "copy-parameters",
    "should copy asset from the source (`from`) to the assets destination " +
    "(`to` + `assetsPath`) and rebase the url keeping parameters",
    opts, postcssOpts)

  opts = Object.assign({}, opts, { useHash: true })

  matchCssResult(
    t,
    patterns.copyHashPixel,
    "copy-hash",
    "should copy asset from the source (`from`) to the assets destination " +
    "(`to` + `assetsPath`) and rebase the url (using a hash name)",
    opts, postcssOpts)

  matchCssResult(
    t,
    patterns.copyHashParamsPixel,
    "copy-hash-parameters",
    "should copy asset from the source (`from`) to the assets " +
    "destination (`to` + `assetsPath`) and rebase the url (using a " +
    "hash name) keeping parameters",
    opts, postcssOpts)

  t.end()
}

test("copy-without-assetsPath", function(t) {
  var opts = {
    url: "copy",
  }
  compareFixtures(
    t,
    "cant-copy",
    "shouldn't copy assets if no info available", opts)

  var postcssOpts = {
    from: "test/fixtures/index.css",
    to: "test/fixtures/build/index.css",
  }

  testCopy(t, opts, postcssOpts)
})

test("copy-with-assetsPath", function(t) {
  var opts = {
    url: "copy",
    assetsPath: "assets",
  }
  compareFixtures(
    t,
    "cant-copy",
    "shouldn't copy assets if no info available", opts)

  var postcssOpts = {
    from: "test/fixtures/index.css",
    to: "test/fixtures/build/index.css",
  }

  testCopy(t, opts, postcssOpts)
})

test("copy-when-inline-fallback", function(t) {
  var opts = {
    url: "inline",
    maxSize: 0,
    fallback: "copy",
    assetsPath: "assets",
  }

  compareFixtures(
    t,
    "cant-copy",
    "shouldn't copy assets if no info available", opts)

  var postcssOpts = {
    from: "test/fixtures/index.css",
    to: "test/fixtures/build/index.css",
  }

  testCopy(t, opts, postcssOpts)
})

test("function-when-inline-fallback", function(t) {
  var opts = {
    url: "inline",
    maxSize: 0,
    fallback: function() {
      return "one"
    },
  }

  compareFixtures(
    t,
    "inline-fallback-function",
    "should respect the fallback function",
    opts,
    { from: "test/fixtures/index.css" }
  )

  t.end()
})
