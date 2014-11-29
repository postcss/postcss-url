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
  compareFixtures(t, "cant-rebase", "shouldn't rebase url if not info available")
  compareFixtures(t, "rebase-to-from", "should rebase url to dirname(from)", opts, {from: "test/fixtures/transform.css"})
  compareFixtures(t, "rebase-to-to-without-from", "should rebase url to dirname(to)", opts, {to: "transform.css"})
  compareFixtures(t, "rebase-to-to", "should rebase url to dirname(to) even if from given", opts, {from: "test/fixtures/transform.css", to: "transform.css"})
  compareFixtures(t, "rebase-all-url-syntax", "should rebase url even if there is differentes types of quotes", opts, {from: "test/fixtures/transform.css", to: "transform.css"})

  compareFixtures(t, "rebase-imported", "should rebase url of imported files", opts, {from: "test/fixtures/transform.css"}, require("postcss-import"))

  t.end()
})

test("inline", function(t) {
  var opts = {url: "inline"}
  compareFixtures(t, "cant-inline", "shouldn't inline url if not info available", opts)

  t.ok(
    postcss()
      .use(url(opts))
      .process(read("fixtures/inline-from"), {from: "test/fixtures/transform.css"})
      .css
      .match(/;base64/),
    "should inline url from dirname(from)"
  )

  t.notOk(
    postcss()
      .use(url({url: "inline", maxSize: 0}))
      .process(read("fixtures/inline-from"), {from: "test/fixtures/transform.css"})
      .css
      .match(/;base64/),
    "should not inline big files from dirname(from)"
  )

  t.ok(
    postcss()
      .use(require("postcss-import")())
      .use(url(opts))
      .process(read("fixtures/inline-imported"), {from: "test/fixtures/transform.css"})
      .css
      .match(/;base64/),
    "should inline url of imported files"
  )

  t.end()
})

test("custom", function(t) {
  var opts = {url: function(url) { return url.toUpperCase(); }}
  compareFixtures(t, "custom", "should transform url through custom callback", opts)

  t.end()
})

test("absolute-urls", function(t) {
  compareFixtures(t, "aboslute-relativeprotocol", "shouldn't break url if it's absolute (relative protocol, ex '//')");
  compareFixtures(t, "aboslute-httpprotocol", "shouldn't break url if it's absolute (http protocol, ex 'http://')");
  compareFixtures(t, "aboslute-httpsprotocol", "shouldn't break url if it's absolute (https protocol, ex 'https://')");
  compareFixtures(t, "aboslute-url", "shouldn't break url if it's absolute (domain relative, but undetermiable without server, ex '\"/\"')")
  compareFixtures(t, "aboslute-url.quoteless", "shouldn't break url if it's absolute (domain relative, but undetermiable without server, ex '/')")
  t.end();
})
