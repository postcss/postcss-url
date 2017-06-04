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

    compareFixtures(
        'custom-multi',
        'should transform url through custom callback with multi option',
        [
            { url: 'rebase', filter: /\.svg$/ },
            {
                url(asset) {
                    return asset.url.slice(1);
                }
            },
            {
                url(asset) {
                    return asset.url.toLowerCase();
                },
                multi: true
            }
        ]
    );
});
