const path = require('path');

describe('inline', () => {
    const opts = { url: 'inline' };
    const postcssOpts = { from: 'test/fixtures/here' };

    compareFixtures(
        'cant-inline',
        'shouldn\'t inline url if not info available',
        opts
    );

    compareFixtures(
        'can-inline-hash-include',
        'should inline url and include hash, if it has a hash in it and option is enabled',
        { url: 'inline', encodeType: 'encodeURIComponent', includeUriFragment: true },
        postcssOpts
    );

    compareFixtures(
        'can-inline-hash',
        'should inline url and not include hash, if it has a hash in it',
        { url: 'inline', encodeType: 'encodeURIComponent' },
        postcssOpts
    );

    it('should inline url from dirname(from)', () => {
        const css = processedCss('fixtures/inline-from', opts, postcssOpts);

        assert.ok(css.match(/;base64/));
    });

    it('should not inline big files from dirname(from)', () => {
        const css = processedCss(
            'fixtures/inline-from',
            { url: 'inline', maxSize: 0.0001 },
            { from: 'test/fixtures/here' }
        );

        assert.notOk(css.match(/;base64/));
    });

    it('SVGs shouldn\'t be encoded in base64', () => {
        const css = processedCss(
            'fixtures/inline-svg',
            { url: 'inline' },
            postcssOpts
        );

        assert.notOk(css.match(/;base64/));
    });

    it('should inline url of imported files', () => {
        postcss()
            .use(require('postcss-import')())
            .use(postcssUrl(opts))
            .process(read('fixtures/inline-imported'), { from: 'test/fixtures/here' })
            .then((result) => {
                assert.ok(result.css.match(/;base64/));
            });
    });

    it('should inline files matching the minimatch pattern', () => {
        const css = processedCss(
            'fixtures/inline-by-type',
            { url: 'inline', filter: '**/*.svg' },
            postcssOpts
        );

        assert.ok(css.match(/data\:image\/svg\+xml/));
        assert.notOk(
            css.match(/data:image\/gif/),
            'shouldn\'t inline files not matching the minimatch pattern'
        );
    });

    it('should inline files matching the regular expression', () => {
        const css = processedCss(
            'fixtures/inline-by-type',
            { url: 'inline', filter: /\.svg$/ },
            postcssOpts
        );

        assert.ok(css.match(/data\:image\/svg\+xml/));
        assert.notOk(
            css.match(/data:image\/gif/),
            'shouldn\'t inline files not matching the regular expression'
        );
    });

    it('should inline files matching by custom function', () => {
        const customFilterFunction = function(asset) {
            return /\.svg$/.test(asset.absolutePath);
        };
        const css = processedCss(
            'fixtures/inline-by-type',
            { url: 'inline', filter: customFilterFunction },
            postcssOpts
        );

        assert.ok(css.match(/data\:image\/svg\+xml/));
        assert.notOk(
            css.match(/data:image\/gif/),
            'shouldn\'t inline files not matching the regular expression'
        );
    });

    it('function when inline fallback', () => {
        const optsWithFallback = {
            url: 'inline',
            maxSize: 0.0001,
            fallback() {
                return 'one';
            }
        };

        compareFixtures(
            'inline-fallback-function',
            'should respect the fallback function',
            optsWithFallback,
            { from: 'test/fixtures/index.css' }
        );
    });

    it('should find files in basePaths', () => {
        const css = processedCss(
            'fixtures/inline-by-base-paths',
            {
                url: 'inline',
                filter: /\.png$/,
                basePath: [path.resolve('test/fixtures/baseDir1'), 'baseDir2']
            },
            postcssOpts
        );

        assert.equal(css.match(/data:image\/png/g).length, 2);
    });
});
