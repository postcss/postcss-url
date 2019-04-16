const rebase = require('../../src/type/rebase');

describe('rebase', () => {
    const opts = {};

    describe('base unit', () => {
        it('should calc relative path', () => {
            return rebase({
                absolutePath: '/project/blocks/item/1.png',
                search: '',
                hash: ''
            }, {
                to: '/project/build'
            }).then((res) => {
                assert.equal(res, '../blocks/item/1.png');
            });
        });

        it('should calc relative path by assetsPath option', () => {
            return rebase({
                absolutePath: '/project/blocks/item/1.png',
                search: '',
                hash: ''
            }, {
                //  in gulp plugin from === to
                to: '/project/blocks/item/1.png',
                from: '/project/blocks/item/1.png'
            }, {
                assetsPath: '/project/build'
            })
                .then((res) => {
                    assert.equal(res, '../blocks/item/1.png');
                });
        });
    });

    it('rebase with empty options', () => {
        return processedCss(
            'fixtures/copy-hash',
            undefined,
            { from: 'test/fixtures/here' }
        ).then((css) => {
            assert(css);
        });
    });

    compareFixtures(
        'cant-rebase',
        'shouldn\'t rebase url if not info available');
    compareFixtures(
        'rebase-to-from',
        'should rebase url to dirname(from)',
        opts,
        { from: 'test/fixtures/here' }
    );
    compareFixtures(
        'rebase-to-to-without-from',
        'should rebase url to dirname(to)',
        opts,
        { to: 'there' }
    );
    compareFixtures(
        'rebase-to-to',
        'should rebase url to dirname(to) even if from given',
        opts,
        { from: 'test/fixtures/here', to: 'there' }
    );
    compareFixtures(
        'rebase-all-url-syntax',
        'should rebase url even if there is differentes types of quotes',
        opts,
        { from: 'test/fixtures/here', to: 'there' }
    );
    compareFixtures(
        'rebase-querystring-hash',
        'should rebase url that have query string or hash (or both)',
        opts,
        { from: 'test/fixtures/here', to: 'there' }
    );
    compareFixtures(
        'rebase-imported',
        'should rebase url of imported files',
        opts,
        { from: 'test/fixtures/transform.css' }, require('postcss-import')
    );
    compareFixtures(
        'alpha-image-loader',
        'should rebase in filter',
        opts,
        { from: 'test/fixtures/here', to: 'there' }
    );
    compareFixtures(
        'skip-urls-with-tilde',
        'should skip URLs with tilde'
    );
});
