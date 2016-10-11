var test = require("tape")

var fs = require("fs")

var url = require("..")
var postcss = require("postcss")

function read(name) {
  return fs.readFileSync("test/" + name + ".css", "utf8").trim()
}

function compareFixtures(t, name, msg, opts, postcssOpts, plugin) {
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
      .process(read("fixtures/inline-from"), { from: "test/fixtures/here" })
      .css.match(/;base64/),
    "should inline url from dirname(from)"
  )

  t.notOk(
    postcss()
      .use(url({ url: "inline", maxSize: 0 }))
      .process(read("fixtures/inline-from"), { from: "test/fixtures/here" })
      .css.match(/;base64/),
    "should not inline big files from dirname(from)"
  )

  t.notOk(
    postcss()
      .use(url({ url: "inline" }))
      .process(read("fixtures/inline-svg"), { from: "test/fixtures/here" })
      .css.match(/;base64/),
    "SVGs shouldn't be encoded in base64"
  )

  t.ok(
    postcss()
      .use(require("postcss-import")())
      .use(url(opts))
      .process(read("fixtures/inline-imported"), { from: "test/fixtures/here" })
      .css.match(/;base64/),
    "should inline url of imported files"
  )

  t.ok(
    postcss()
      .use(url({ url: "inline", filter: "**/*.svg" }))
      .process(read("fixtures/inline-by-type"), { from: "test/fixtures/here" })
      .css.match(/data\:image\/svg\+xml/),
    "should inline files matching the minimatch pattern"
  )

  t.notOk(
    postcss()
      .use(url({ url: "inline", filter: "**/*.svg" }))
      .process(read("fixtures/inline-by-type"), { from: "test/fixtures/here" })
      .css.match(/data:image\/gif/),
    "shouldn't inline files not matching the minimatch pattern"
  )

  t.ok(
    postcss()
      .use(url({ url: "inline", filter: /\.svg$/ }))
      .process(read("fixtures/inline-by-type"), { from: "test/fixtures/here" })
      .css.match(/data\:image\/svg\+xml/),
    "should inline files matching the regular expression"
  )

  t.notOk(
    postcss()
      .use(url({ url: "inline", filter: /\.svg$/ }))
      .process(read("fixtures/inline-by-type"), { from: "test/fixtures/here" })
      .css.match(/data:image\/gif/),
    "shouldn't inline files not matching the regular expression"
  )

  var customFilterFunction = function(filename) {
    return /\.svg$/.test(filename)
  }

  t.ok(
    postcss()
      .use(url({ url: "inline", filter: customFilterFunction }))
      .process(read("fixtures/inline-by-type"), { from: "test/fixtures/here" })
      .css.match(/data\:image\/svg\+xml/),
    "should inline files matching the regular expression"
  )

  t.notOk(
    postcss()
      .use(url({ url: "inline", filter: customFilterFunction }))
      .process(read("fixtures/inline-by-type"), { from: "test/fixtures/here" })
      .css.match(/data:image\/gif/),
    "shouldn't inline files not matching the regular expression"
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
      css.match(patterns.copyParamsPixelPngHash) &&
      css.match(patterns.copyParamsPixelPngParam) &&
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
    "shouldn't copy assets if not info available", opts)

  var postcssOpts = {
    from: "test/fixtures/index.css",
    to: "test/fixtures/build/index.css",
  }

  testCopy(t, opts, postcssOpts)
})

function removeFile(filename) {
  try {
    fs.unlinkSync(filename);
  }
  catch(e) {
    // ignore file does not exist
    if (e.toString().indexOf('ENOENT') < 0) {
      throw e;
    }
  }
}

function fileExists(filename) {
  try {
    fs.statSync(filename);
    return true;
  }
  catch(e) {
    // ignore file does not exist
    if (e.toString().indexOf('ENOENT') < 0) {
      throw e;
    }
    return false;
  }
}

function testFileExists(t, filename) {
  t.ok(
    fileExists(filename),
    'file ' + filename + ' should exist'
  );
}

test("copy-nested-with-assetsPath", function(t) {
  removeFile('test/fixtures/build/assets/pixel.gif');
  removeFile('test/fixtures/build/assets/imported/pixel.png');
  var opts = {
    url: "copy",
    assetsPath: "assets/nested",
  }
  var postcssOpts = {
    from: "test/fixtures/nested/index.css",
    to: "test/fixtures/build/index.css",
  }

  compareFixtures(
    t,
    "nested/copy",
    "should copy assets from relative path starting with ../",
    opts,
    postcssOpts,
    require("postcss-import")
  );

  testFileExists(t, 'test/fixtures/build/assets/pixel.gif');
  testFileExists(t, 'test/fixtures/build/assets/imported/pixel.png');

  t.end();
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
