var test = require("tape")

var fs = require("fs")

var url = require("..")
var postcss = require("postcss")

function read(name) {
  return fs.readFileSync("test/" + name + ".css", "utf8").trim()
}

function compareFixtures(
  t,
  name, msg, opts, postcssOpts, plugin) {
  opts = opts || {}
  var pcss = postcss()
  if (plugin) {
    pcss.use(plugin())
  }
  pcss.use(url(opts))
  var actual = pcss.process(read("fixtures/" + name), postcssOpts).css
  var expected = read("fixtures/" + name + ".expected")

  // handy thing: checkout actual in the *.actual.css file
  fs.writeFile("test/fixtures/" + name + ".actual.css", actual)

  t.equal(actual, expected, msg)
}

test("rebase", function(t) {
  var opts = {}
  compareFixtures(
    t,
    "cant-rebase",
    "shouldn't rebase url if not info available")
  compareFixtures(
    t,
    "rebase-to-from",
    "should rebase url to dirname(from)",
    opts,
    {from: "test/fixtures/here"}
  )
  compareFixtures(
    t,
    "rebase-to-to-without-from",
    "should rebase url to dirname(to)",
    opts,
    {to: "there"}
  )
  compareFixtures(
    t,
    "rebase-to-to",
    "should rebase url to dirname(to) even if from given",
    opts,
    {from: "test/fixtures/here", to: "there"}
  )
  compareFixtures(
    t,
    "rebase-all-url-syntax",
    "should rebase url even if there is differentes types of quotes",
    opts,
    {from: "test/fixtures/here", to: "there"}
  )
  compareFixtures(
    t,
    "rebase-querystring-hash",
    "should rebase url that have query string or hash (or both)",
    opts,
    {from: "test/fixtures/here", to: "there"}
  )
  compareFixtures(
    t,
    "rebase-imported",
    "should rebase url of imported files",
    opts,
    {from: "test/fixtures/transform.css"}, require("postcss-import")
  )

  t.end()
})

test("inline", function(t) {
  var opts = {url: "inline"}
  compareFixtures(
    t,
    "cant-inline",
    "shouldn't inline url if not info available", opts)

  compareFixtures(
    t,
    "cant-inline-hash",
    "shouldn't inline url if it has a hash in it", opts)

  t.ok(
    postcss()
      .use(url(opts))
      .process(read("fixtures/inline-from"), {from: "test/fixtures/here"})
      .css.match(/;base64/),
    "should inline url from dirname(from)"
  )

  t.notOk(
    postcss()
      .use(url({url: "inline", maxSize: 0}))
      .process(read("fixtures/inline-from"), {from: "test/fixtures/here"})
      .css.match(/;base64/),
    "should not inline big files from dirname(from)"
  )

  t.notOk(
    postcss()
      .use(url({url: "inline"}))
      .process(read("fixtures/inline-svg"), {from: "test/fixtures/here"})
      .css.match(/;base64/),
    "SVGs shouldn't be encoded in base64"
  )

  t.ok(
    postcss()
      .use(require("postcss-import")())
      .use(url(opts))
      .process(read("fixtures/inline-imported"), {from: "test/fixtures/here"})
      .css.match(/;base64/),
    "should inline url of imported files"
  )

  t.end()
})

test("custom", function(t) {
  var declOk = false
  var opts = {
    url: function(URL, decl, from, dirname, to, options) {
      if (!declOk) {
        t.ok(decl,
            "should offer postcss decl as second parameter")
        t.ok(options,
            "should offer postcss decl as last parameter")
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

function makeRegex(str) {
  return new RegExp(
    str
      .replace(/\//g, "\\\/")
      .replace(/\./g, "\\.")
      .replace(/\?/g, "\\?")
  )
}

function testCopy(t, opts, postcssOpts) {
  var assetsPath = ""
  if (opts.assetsPath) {
    assetsPath = opts.assetsPath + "/"
  }

  var patterns = {
    copyPixelPng: makeRegex(
      "\"" + assetsPath + "imported/pixel.png\""
    ),
    copyPixelGif: makeRegex(
      "\"" + assetsPath + "pixel.gif\""
    ),
    copyParamsPixelPng: makeRegex(
      "\"" + assetsPath + "imported/pixel.png?#iefix&v=4.4.0\""
    ),
    copyParamsPixelGif: makeRegex(
      "\"" + assetsPath + "pixel.gif#el\""
    ),
    copyHashPixel: makeRegex(
      "\"" + assetsPath + "[a-z0-9]{16}.png\""
    ),
    copyHashParamsPixel: makeRegex(
      "\"" + assetsPath + "[a-z0-9]{16}.png?#iefix&v=4.4.0\""
    ),
  }

  var css = postcss()
    .use(url(opts))
    .process(read("fixtures/copy"), postcssOpts)
    .css

  t.ok(
    (
      css.match(patterns.copyPixelPng) &&
      css.match(patterns.copyPixelGif)
    ),
    "should copy asset from the source (`from`) to the assets destination " +
    "(`to` + `assetsPath`) and rebase the url"
  )

  css = postcss()
    .use(url(opts))
    .process(read("fixtures/copy-parameters"), postcssOpts)
    .css

  t.ok(
    (
      css.match(patterns.copyParamsPixelPng) &&
      css.match(patterns.copyParamsPixelGif)
    ),
    "should copy asset from the source (`from`) to the assets destination " +
    "(`to` + `assetsPath`) and rebase the url keeping parameters"
  )

  opts.useHash = true

  t.ok(
    postcss()
      .use(url(opts))
      .process(read("fixtures/copy-hash"), postcssOpts)
      .css.match(patterns.copyHashPixel),
    "should copy asset from the source (`from`) to the assets destination " +
    "(`to` + `assetsPath`) and rebase the url (using a hash name)"
  )

  t.ok(
    postcss()
      .use(url(opts))
      .process(read("fixtures/copy-hash-parameters"), postcssOpts)
      .css.match(patterns.copyHashParamsPixel),
    "should copy asset from the source (`from`) to the assets destination " +
      "(`to` + `assetsPath`) and rebase the url (using a hash name) keeping " +
      "parameters"
  )

  t.end()
}

function testCopyKeepPath(t, opts, postcssOpts) {
  var patterns = {}
  if (!(opts.assetsPath)) {
    patterns.copyPixelPng = makeRegex("\"../../imported/pixel.png\"")
    patterns.copyPagePng = makeRegex("\"../images/page.png\"")
    patterns.copyParamsPixelPng = makeRegex(
      "\"../../imported/pixel.png?#iefix&v=4.4.0\""
    )
    patterns.copyParamsPagePng = makeRegex(
      "\"../images/page.png#el\""
    )
    patterns.copyHashPage = makeRegex(
      "\"../../[a-z0-9]{16}.png\""
    )
    patterns.copyHashParamsPage = makeRegex(
      "\"../../[a-z0-9]{16}.png?#iefix&v=4.4.0\""
    )
  }
  else {
    patterns.copyPixelPng = makeRegex(
      "\"../../assets/imported/pixel.png\""
    )
    patterns.copyPagePng = makeRegex(
      "\"../../assets/page/images/page.png\""
    )
    patterns.copyParamsPixelPng = makeRegex(
      "\"../../assets/imported/pixel.png?#iefix&v=4.4.0\""
    )
    patterns.copyParamsPagePng = makeRegex(
      "\"../../assets/page/images/page.png#el\""
    )
    patterns.copyHashPage = makeRegex(
      "\"../../assets/[a-z0-9]{16}.png\""
    )
    patterns.copyHashParamsPage = makeRegex(
      "\"../../assets/[a-z0-9]{16}.png?#iefix&v=4.4.0\""
    )
  }

  var css = postcss()
    .use(url(opts))
    .process(read("fixtures/src/page/index/copy"), postcssOpts)
    .css

  t.ok(
    (
      css.match(patterns.copyPixelPng) &&
      css.match(patterns.copyPagePng)
    ),
    "should copy asset from the source (`from`) to the assets destination " +
    "(`to` + `assetsPath`) and rebase the url"
  )

  css = postcss()
    .use(url(opts))
    .process(read("fixtures/src/page/index/copy-parameters"), postcssOpts)
    .css

  t.ok(
    (
      css.match(patterns.copyParamsPixelPng) &&
      css.match(patterns.copyParamsPagePng)
    ),
    "should copy asset from the source (`from`) to the assets destination " +
    "(`to` + `assetsPath`) and rebase the url keeping parameters"
  )

  opts.useHash = true

  t.ok(
    postcss()
      .use(url(opts))
      .process(read("fixtures/src/page/index/copy-hash"), postcssOpts)
      .css.match(patterns.copyHashPage),
    "should copy asset from the source (`from`) to the assets destination " +
    "(`to` + `assetsPath`) and rebase the url (using a hash name)"
  )

  t.ok(
    postcss()
      .use(url(opts))
      .process(
        read("fixtures/src/page/index/copy-hash-parameters"),
        postcssOpts
      )
      .css.match(patterns.copyHashParamsPage),
    "should copy asset from the source (`from`) to the assets destination " +
      "(`to` + `assetsPath`) and rebase the url (using a hash name) keeping " +
      "parameters"
  )

  t.end()
}

test("copy-without-assetsPath", function(t) {
  var opts = {
    url: "copy",
  }
  compareFixtures(
    t,
    "cant-copy",
    "shouldn't copy assets if not info available", opts)

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
    "shouldn't copy assets if not info available", opts)

  var postcssOpts = {
    from: "test/fixtures/index.css",
    to: "test/fixtures/build/index.css",
  }

  testCopy(t, opts, postcssOpts)
})

test("copy-without-assetsPath-keep-old-path", function(t) {
  var opts = {
    url: "copy",
  }
  compareFixtures(
    t,
    "cant-copy",
    "shouldn't copy assets if not info available", opts)

  var postcssOpts = {
    from: "test/fixtures/src/page/index/index.css",
    to: "test/fixtures/build/index.css",
  }

  testCopyKeepPath(t, opts, postcssOpts)
})

test("copy-with-assetsPath-keep-old-path", function(t) {
  var opts = {
    url: "copy",
    assetsPath: "assets",
  }
  compareFixtures(
    t,
    "cant-copy",
    "shouldn't copy assets if not info available", opts)

  var postcssOpts = {
    from: "test/fixtures/src/page/index/index.css",
    to: "test/fixtures/build/index.css",
  }

  testCopyKeepPath(t, opts, postcssOpts)
})

test("copy-when-inline-fallback", function(t) {
  var opts = {
    url: "inline",
    maxSize: 0,
    fallback: "copy",
  }

  compareFixtures(
    t,
    "cant-copy",
    "shouldn't copy assets if not info available", opts)

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
    {from: "test/fixtures/index.css"}
  )

  t.end()
})
