'use strict';

let test = require('tape');

let fs = require('fs');

let url = require('../src');
let postcss = require('postcss');

function read(name) {
  return fs.readFileSync('test/' + name + '.css', 'utf8').trim();
}

function compareFixtures(t, name, msg, opts, postcssOpts, plugin) {
  opts = opts || {};
  let pcss = postcss();
  if (plugin) {
    pcss.use(plugin());
  }
  pcss.use(url(opts));
  let actual = pcss.process(read('fixtures/' + name), postcssOpts).css;
  let expected = read('fixtures/' + name + '.expected');

  // handy thing: checkout actual in the *.actual.css file
  fs.writeFile('test/fixtures/' + name + '.actual.css', actual);

  t.equal(actual, expected, msg);
}

test('rebase', function (t) {
  let opts = {};
  compareFixtures(
    t,
    'cant-rebase',
    'shouldn\'t rebase url if not info available');
  compareFixtures(
    t,
    'rebase-to-from',
    'should rebase url to dirname(from)',
    opts,
    { from: 'test/fixtures/here' }
  );
  compareFixtures(
    t,
    'rebase-to-to-without-from',
    'should rebase url to dirname(to)',
    opts,
    { to: 'there' }
  );
  compareFixtures(
    t,
    'rebase-to-to',
    'should rebase url to dirname(to) even if from given',
    opts,
    { from: 'test/fixtures/here', to: 'there' }
  );
  compareFixtures(
    t,
    'rebase-all-url-syntax',
    'should rebase url even if there is differentes types of quotes',
    opts,
    { from: 'test/fixtures/here', to: 'there' }
  );
  compareFixtures(
    t,
    'rebase-querystring-hash',
    'should rebase url that have query string or hash (or both)',
    opts,
    { from: 'test/fixtures/here', to: 'there' }
  );
  compareFixtures(
    t,
    'rebase-imported',
    'should rebase url of imported files',
    opts,
    { from: 'test/fixtures/transform.css' }, require('postcss-import')
  );
  compareFixtures(
    t,
    'alpha-image-loader',
    'should rebase in filter',
    opts,
    { from: 'test/fixtures/here', to: 'there' }
  );

  t.end();
});

test('inline', function (t) {
  let opts = { url: 'inline' };
  compareFixtures(
    t,
    'cant-inline',
    'shouldn\'t inline url if not info available', opts);

  compareFixtures(
    t,
    'can-inline-hash',
    'should inline url if it has a hash in it',
    { url: 'inline', encodeType: 'encodeURIComponent' },
    { from: 'test/fixtures/here' });

  t.ok(
    postcss()
      .use(url(opts))
      .process(read('fixtures/inline-from'), { from: 'test/fixtures/here' })
      .css.match(/;base64/),
    'should inline url from dirname(from)'
  );

  t.notOk(
    postcss()
      .use(url({ url: 'inline', maxSize: 0 }))
      .process(read('fixtures/inline-from'), { from: 'test/fixtures/here' })
      .css.match(/;base64/),
    'should not inline big files from dirname(from)'
  );

  t.notOk(
    postcss()
      .use(url({ url: 'inline', encodeType: 'encodeURIComponent' }))
      .process(read('fixtures/inline-svg'), { from: 'test/fixtures/here' })
      .css.match(/;base64/),
    'SVGs shouldn\'t be encoded in base64'
  );

  t.ok(
    postcss()
      .use(require('postcss-import')())
      .use(url(opts))
      .process(read('fixtures/inline-imported'), { from: 'test/fixtures/here' })
      .css.match(/;base64/),
    'should inline url of imported files'
  );

  t.ok(
    postcss()
      .use(url({ url: 'inline', filter: '**/*.svg', encodeType: 'encodeURIComponent' }))
      .process(read('fixtures/inline-by-type'), { from: 'test/fixtures/here' })
      .css.match(/data\:image\/svg\+xml/),
    'should inline files matching the minimatch pattern'
  );

  t.notOk(
    postcss()
      .use(url({ url: 'inline', filter: '**/*.svg', encodeType: 'encodeURIComponent' }))
      .process(read('fixtures/inline-by-type'), { from: 'test/fixtures/here' })
      .css.match(/data:image\/gif/),
    'shouldn\'t inline files not matching the minimatch pattern'
  );

  t.ok(
    postcss()
      .use(url({ url: 'inline', filter: /\.svg$/, encodeType: 'encodeURIComponent' }))
      .process(read('fixtures/inline-by-type'), { from: 'test/fixtures/here' })
      .css.match(/data\:image\/svg\+xml/),
    'should inline files matching the regular expression'
  );

  t.notOk(
    postcss()
      .use(url({ url: 'inline', filter: /\.svg$/, encodeType: 'encodeURIComponent' }))
      .process(read('fixtures/inline-by-type'), { from: 'test/fixtures/here' })
      .css.match(/data:image\/gif/),
    'shouldn\'t inline files not matching the regular expression'
  );

  let customFilterFunction = function (filename) {
    return /\.svg$/.test(filename);
  };

  t.ok(
    postcss()
      .use(url({ url: 'inline', filter: customFilterFunction, encodeType: 'encodeURIComponent' }))
      .process(read('fixtures/inline-by-type'), { from: 'test/fixtures/here' })
      .css.match(/data\:image\/svg\+xml/),
    'should inline files matching the regular expression'
  );

  t.notOk(
    postcss()
      .use(url({ url: 'inline', filter: customFilterFunction }))
      .process(read('fixtures/inline-by-type'), { from: 'test/fixtures/here' })
      .css.match(/data:image\/gif/),
    'shouldn\'t inline files not matching the regular expression'
  );

  t.end();
});

test('custom', function (t) {
  let declOk = false;
  let opts = {
    url: function (URL, dir, options, result, decl) {
      if (!declOk) {
        t.ok(decl,
            'should offer postcss decl as second parameter');
        t.ok(options,
            'should offer postcss decl as last parameter');
        declOk = true;
      }
      return URL.toUpperCase();
    }
  };
  compareFixtures(
    t,
    'custom',
    'should transform url through custom callback', opts);

  t.end();
});

test('ignore absolute urls, data uris, or hashes', function (t) {
  compareFixtures(
    t,
    'absolute-urls',
    'shouldn\'t not transform absolute urls, hashes or data uris');

  t.end();
});

function testCopy(t, opts, postcssOpts) {
  let assetsPath = '';
  if (opts.assetsPath) {
    assetsPath = opts.assetsPath + '\/';
  }
  let patterns = {
    copyPixelPng:
      new RegExp('"' + assetsPath + 'imported\/pixel\.png"'),
    copyPixelGif:
      new RegExp('"' + assetsPath + 'pixel\\.gif"'),
    copyParamsPixelPngHash:
      new RegExp('"' + assetsPath + 'imported\/pixel\\.png\\?\#iefix"'),
    copyParamsPixelPngParam:
      new RegExp('"' + assetsPath + 'imported\/pixel\\.png\\?foo=bar"'),
    copyParamsPixelGif:
      new RegExp('"' + assetsPath + 'pixel\\.gif\\#el"'),
    copyXXHashPixel8:
      new RegExp("\"" + assetsPath + "[a-z0-9]{8}\\.png\""),
    copyXXHashParamsPixel8:
      new RegExp("\"" + assetsPath + "[a-z0-9]{8}\\.png\\?v=1\\.1\\#iefix\""),
    copyXXHashPixel16:
      new RegExp("\"" + assetsPath + "[a-z0-9]{16}\\.png\""),
    copyXXHashParamsPixel16:
      new RegExp("\"" + assetsPath + "[a-z0-9]{16}\\.png\\?v=1\\.1\\#iefix\""),
    copyCustomHashPixel16:
      new RegExp("\"" + assetsPath + "123\\.png\""),
  };

  let css = postcss()
    .use(url(opts))
    .process(read('fixtures/copy'), postcssOpts)
    .css;

  t.ok(
    (
      css.match(patterns.copyPixelPng) &&
      css.match(patterns.copyPixelGif)
    ),
    'should copy asset from the source (`from`) to the assets destination ' +
    '(`to` + `assetsPath`) and rebase the url'
  );

  css = postcss()
    .use(url(opts))
    .process(read('fixtures/copy-parameters'), postcssOpts)
    .css;

  t.ok(
    (
      css.match(patterns.copyParamsPixelPngHash) &&
      css.match(patterns.copyParamsPixelPngParam) &&
      css.match(patterns.copyParamsPixelGif)
    ),
    'should copy asset from the source (`from`) to the assets destination ' +
    '(`to` + `assetsPath`) and rebase the url keeping parameters'
  );

  opts.useHash = true;
  opts.hashOptions = {
    method: "xxhash32",
    shrink: 8,
  }

  t.ok(
    postcss()
      .use(url(opts))
      .process(read("fixtures/copy-hash"), postcssOpts)
      .css.match(patterns.copyXXHashPixel8),
    "should copy asset from the source (`from`) to the assets destination " +
    "(`to` + `assetsPath`) and rebase the url (using a xxhash32 hash name )"
  )

  t.ok(
    postcss()
      .use(url(opts))
      .process(read("fixtures/copy-hash-parameters"), postcssOpts)
      .css.match(patterns.copyXXHashParamsPixel8),
    "should copy asset from the source (`from`) to the assets destination " +
      "(`to` + `assetsPath`) and rebase the url (using a xxhash32 hash name" +
      ") keeping parameters"
  )

  opts.hashOptions = {
    method: "xxhash64",
    shrink: 16,
  }

  t.ok(
    postcss()
      .use(url(opts))
      .process(read("fixtures/copy-hash"), postcssOpts)
      .css.match(patterns.copyXXHashPixel16),
    "should copy asset from the source (`from`) to the assets destination " +
    "(`to` + `assetsPath`) and rebase the url (using a xxhash32 hash name )"
  )

  t.ok(
    postcss()
      .use(url(opts))
      .process(read("fixtures/copy-hash-parameters"), postcssOpts)
      .css.match(patterns.copyXXHashParamsPixel16),
    "should copy asset from the source (`from`) to the assets destination " +
      "(`to` + `assetsPath`) and rebase the url (using a xxhash32 hash name" +
      ") keeping parameters"
  )

  opts.hashOptions = {
    method: () => "12345",
    shrink: 3,
  }

  t.ok(
    postcss()
      .use(url(opts))
      .process(read("fixtures/copy-hash"), postcssOpts)
      .css.match(patterns.copyCustomHashPixel),
    "should copy asset from the source (`from`) to the assets destination " +
    "(`to` + `assetsPath`) and rebase the url (using a custom hash name )"
  )  


  t.end();
}

test('copy-without-assetsPath', function (t) {
  let opts = {
    url: 'copy'
  };
  compareFixtures(
    t,
    'cant-copy',
    'shouldn\'t copy assets if not info available', opts);

  let postcssOpts = {
    from: 'test/fixtures/index.css',
    to: 'test/fixtures/build/index.css'
  };

  testCopy(t, opts, postcssOpts);
});

test('copy-with-assetsPath', function (t) {
  let opts = {
    url: 'copy',
    assetsPath: 'assets'
  };
  compareFixtures(
    t,
    'cant-copy',
    'shouldn\'t copy assets if not info available', opts);

  let postcssOpts = {
    from: 'test/fixtures/index.css',
    to: 'test/fixtures/build/index.css'
  };

  testCopy(t, opts, postcssOpts);
});

test('copy-when-inline-fallback', function (t) {
  let opts = {
    url: 'inline',
    maxSize: 0,
    fallback: 'copy',
    assetsPath: 'assets'
  };

  compareFixtures(
    t,
    'cant-copy',
    'shouldn\'t copy assets if not info available', opts);

  let postcssOpts = {
    from: 'test/fixtures/index.css',
    to: 'test/fixtures/build/index.css'
  };

  testCopy(t, opts, postcssOpts);
});

test('function-when-inline-fallback', function (t) {
  let opts = {
    url: 'inline',
    maxSize: 0,
    fallback: function () {
      return 'one';
    }
  };

  compareFixtures(
    t,
    'inline-fallback-function',
    'should respect the fallback function',
    opts,
    { from: 'test/fixtures/index.css' }
  );

  t.end();
});
