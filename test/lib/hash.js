const calcHash = require('../../src/lib/hash');
const fs = require('fs');

describe('hash', () => {
    const fileContent = fs.readFileSync('test/fixtures/pixel.gif');

    it('should calc hash with default params (xxhash32 and shrink=8)', () => {
        assert.equal(calcHash(fileContent), 'fb27d692');
    });

    it('should calc hash (xxhash64 and shrink=16)', () => {
        const options = {
            method: 'xxhash64',
            shrink: 16
        };

        assert.equal(calcHash(fileContent, options), '56ed89bfa97a733e');
    });

    it('should calc hash with custom function', () => {
        const options = {
            method: () => '12345',
            shrink: 3
        };

        assert.equal(calcHash(fileContent, options), '123');
    });

    it('should calc hash with crypto method', () => {
        const options = {
            method: 'sha256',
            shrink: 16
        };

        assert.equal(calcHash(fileContent, options), '09d46019c7a75b96');
    });
});
