const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const postcss = require('postcss');
const url = require('../src');
const fs = require('fs');

// expose node:test runner functions as globals (mocha-like API)
global.describe = describe;
global.it = it;
global.before = before;
global.after = after;

// expose a chai-like assert: callable like `assert(value)` (node:assert is a
// function aliasing `assert.ok`), with all node:assert methods + a `notOk` helper
function assertFn(...args) {
    return assert(...args);
}
Object.assign(assertFn, assert, {
    notOk(value, message) {
        assert.ok(!value, message);
    }
});
global.assert = assertFn;

global.compareFixtures = compareFixtures;
global.read = read;
global.processedCss = processedCss;
global.postcss = postcss;
global.postcssUrl = url;

function compareFixtures(name, msg, opts, postcssOpts, plugin) {
    it(msg, () => {
        opts = opts || {};
        const plugins = [];

        if (plugin) {
            plugins.push(plugin());
        }

        plugins.push(url(opts));

        return postcss(plugins).process(read(`fixtures/${name}`), postcssOpts)
            .then((result) => {
                const actual = result.css;
                const expected = read(`fixtures/${name}.expected`);

                // handy thing: checkout actual in the *.actual.css file
                fs.writeFile(`test/fixtures/${name}.actual.css`, actual, () => {});

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
        .then((res) => res.css);
}
