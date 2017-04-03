describe('copy without assetsPath', () => {
    const opts = {
        url: 'copy'
    };

    compareFixtures(
        'cant-copy',
        'shouldn\'t copy assets if not info available',
        opts
    );

    const postcssOpts = {
        from: 'test/fixtures/index.css',
        to: 'test/fixtures/build/index.css'
    };

    testCopy(opts, postcssOpts);
});

describe('copy with assetsPath', () => {
    const opts = {
        url: 'copy',
        assetsPath: 'assets'
    };

    compareFixtures(
        'cant-copy',
        'shouldn\'t copy assets if not info available',
        opts
    );

    const postcssOpts = {
        from: 'test/fixtures/index.css',
        to: 'test/fixtures/build/index.css'
    };

    testCopy(opts, postcssOpts);
});

describe('copy with assetsPath and without "to"', () => {
    const opts = {
        url: 'copy',
        assetsPath: 'test/fixtures/build/assets'
    };

    const postcssOpts = {
        from: 'test/fixtures/index.css'
    };

    testCopy(opts, postcssOpts);
});

describe('copy when inline fallback', () => {
    const opts = {
        url: 'inline',
        maxSize: 0.0001,
        fallback: 'copy',
        assetsPath: 'assets'
    };

    compareFixtures(
        'cant-copy',
        'shouldn\'t copy assets if not info available',
        opts
    );

    const postcssOpts = {
        from: 'test/fixtures/index.css',
        to: 'test/fixtures/build/index.css'
    };

    testCopy(opts, postcssOpts);
});

function testCopy(opts, postcssOpts) {
    const optsWithHash = Object.assign({}, opts, { useHash: true });
    const assetsPath = opts.assetsPath ? `${opts.assetsPath}\/` : '';
    const patterns = {
        copyPixelPng: new RegExp(`"${assetsPath}imported\/pixel\.png"`),
        copyPixelGif: new RegExp(`"${assetsPath}pixel\\.gif"`),
        copyParamsPixelPngHash: new RegExp(`"${assetsPath}imported\/pixel\\.png\\?\#iefix"`),
        copyParamsPixelPngParam: new RegExp(`"${assetsPath}imported\/pixel\\.png\\?foo=bar"`),
        copyParamsPixelGif: new RegExp(`"${assetsPath}pixel\\.gif\\#el"`),
        copyXXHashPixel8: new RegExp(`"${assetsPath}[a-z0-9]{8}\\.png"`),
        copyXXHashParamsPixel8: new RegExp(`"${assetsPath}[a-z0-9]{8}\\.png\\?v=1\\.1\\#iefix"`)
    };
    const matchAll = (css, patternsKeys) =>
        assert.ok(patternsKeys.every((pat) => css.match(patterns[pat])));

    describe('should copy asset from the source (`from`) to the assets destination (`to` + `assetsPath`)', () => {
        it('rebase the url', () => {
            const css = processedCss('fixtures/copy', opts, postcssOpts);

            matchAll(css, ['copyPixelPng', 'copyPixelGif']);
        });

        it('rebase the url keeping parameters', () => {
            const css = processedCss('fixtures/copy-parameters', opts, postcssOpts);

            matchAll(css, [
                'copyParamsPixelPngHash',
                'copyParamsPixelPngParam',
                'copyParamsPixelGif'
            ]);
        });

        it('rebase the url using a hash name', () => {
            const css = processedCss(
                'fixtures/copy-hash',
                optsWithHash,
                postcssOpts
            );

            matchAll(css, ['copyXXHashPixel8']);
        });

        it('rebase the url using a hash name keeping parameters', () => {
            const css = processedCss(
                'fixtures/copy-hash-parameters',
                optsWithHash,
                postcssOpts
            );

            matchAll(css, ['copyXXHashParamsPixel8']);
        });
    });
}
