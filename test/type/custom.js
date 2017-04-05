describe('custom', () => {
    const opts = {
        url(asset, dir, options, decl, warn, result) {
            assert.ok(asset.url);
            assert.ok(dir.from);
            assert.ok(options);
            assert.ok(decl.value);
            assert.ok(result.opts);
            assert.equal(typeof warn, 'function');

            return asset.url.toUpperCase();
        }
    };

    compareFixtures(
        'custom',
        'should transform url through custom callback',
        opts
    );

    it.only('should work with steven css and config :)', () => {
        const css = processedCss(
            'fixtures/steven-example',
            { url: function() {return 'replaced-font-url'} }
        );
        assert.match(css, /replaced-font-url/);
    });
});
