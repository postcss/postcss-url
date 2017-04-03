'use strict';

const fs = require('fs');
const path = require('path');
const getFile = require('../../src/lib/get-file');

describe('get-file', () => {
    const fileContent = fs.readFileSync('test/fixtures/pixel.gif');
    const dir = { from: 'test/fixtures' };
    const warn = (message) => assert.fail(null, null, message);

    it('should read file without basePath option', () => {
        const asset = {
            pathname: '../pixel.gif',
            absolutePath: 'test/fixtures/pixel.gif'
        };
        const file = getFile(asset, {}, dir, warn);

        assert.deepEqual(file, {
            path: 'test/fixtures/pixel.gif',
            contents: fileContent,
            mimeType: 'image/gif'
        });
    });

    it('should show warn message when can\'t read file', () => {
        const asset = {
            pathname: '../pixel.gif',
            absolutePath: 'test/fixtures/pixel-no-exists.gif'
        };
        let warnMessage = false;

        getFile(asset, {}, dir, (message) => warnMessage = message);

        assert.equal(
            warnMessage,
            'Can\'t read file \'test/fixtures/pixel-no-exists.gif\', ignoring'
        );
    });

    it('should read file with basePath option', () => {
        const options = { basePath: path.resolve('test/fixtures/imported') };
        const asset = {
            pathname: '../pixel.gif',
            absolutePath: 'test/fixtures/pixel-not-exists.gif'
        };
        const file = getFile(asset, options, dir, warn);

        assert.deepEqual(file, {
            path: path.resolve('test/fixtures/pixel.gif'),
            contents: fileContent,
            mimeType: 'image/gif'
        });
    });

    it('should read file with multiple basePath option', () => {
        const options = { basePath: [
            'not-exists-folder',
            path.resolve('test/fixtures/imported')
        ] };
        const asset = {
            pathname: '../pixel.gif',
            absolutePath: 'test/fixtures/pixel-not-exists.gif'
        };
        const file = getFile(asset, options, dir, warn);

        assert.deepEqual(file, {
            path: path.resolve('test/fixtures/pixel.gif'),
            contents: fileContent,
            mimeType: 'image/gif'
        });
    });
});
