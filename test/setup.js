const chai = require('chai');
const postcss = require('postcss');
const url = require('../src');
const fs = require('fs');

global.assert = chai.assert;
global.compareFixtures = compareFixtures;
global.read = read;
global.processedCss = processedCss;
global.postcss = postcss;
global.postcssUrl = url;

function compareFixtures(name, msg, opts, postcssOpts, plugin) {
    it(msg, () => {
        opts = opts || {};
        const pcss = postcss();

        if (plugin) {
            pcss.use(plugin());
        }

        pcss.use(url(opts));
        pcss.process(read(`fixtures/${name}`), postcssOpts)
          .then((result) => {
              const actual = result.css;
              const expected = read(`fixtures/${name}.expected`);

            // handy thing: checkout actual in the *.actual.css file
              fs.writeFile(`test/fixtures/${name}.actual.css`, actual);

              assert.equal(actual, expected);
          });
    });
}

function read(name) {
    return fs.readFileSync(`test/${name}.css`, 'utf8').trim();
}

function processedCss(fixtures, urlOpts, postcssOpts) {
    return postcss()
    .use(url(urlOpts))
    .process(read(fixtures), postcssOpts)
        .css;
}
