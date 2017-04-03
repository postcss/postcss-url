const matchOptions = require('../../src/lib/match-options');

describe('match options', () => {
    it('should match options from array', () => {
        const options = [
            { url: 'copy', filter: '**/*.png' },
            { url: 'inline', filter: '**/*.gif' },
            { url: 'rebase', filter: '**/*.svg' }
        ];
        const filepath = '/some/path/to/asset.gif';

        assert.equal(matchOptions(filepath, options).url, 'inline');
    });

    it('should find first matched option by path', () => {
        const options = [
            { url: 'copy', filter: '/some/another/path/**/*.png' },
            { url: 'inline', filter: 'some/path/**/*.gif' },
            { url: 'inline2', filter: 'some/path/**/*.gif' },
            { url: 'rebase', filter: '/asset/path/**/*.svg' }
        ];
        const filepath = 'some/path/to/asset.gif';
        const option = matchOptions(filepath, options);

        assert.equal(option && option.url, 'inline');
    });
});
