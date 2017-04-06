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
    compareFixtures(
        'custom',
        'should transform url through custom callback with array options',
        [
            { url: 'rebase', filter: /\.svg$/ },
            opts
        ]
    );
});
