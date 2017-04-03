describe('rebase', () => {
    const opts = {};

    it('rebase with empty options', () => {
        processedCss(
            'fixtures/copy-hash',
            undefined,
            { from: 'test/fixtures/here' }
        ).css;
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
});
