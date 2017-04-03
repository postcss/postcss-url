'use strict';

const xxh = require('xxhashjs');
const HEXBASE = 16;

const defaultHashOptions = {
    method: 'xxhash32',
    shrink: 8
};

const getxxhash = (content, options) => {
    const hashFunc = options.method === 'xxhash32' ? xxh.h32 : xxh.h64;
    const seed = 0;

    return hashFunc(seed)
    .update(content)
    .digest()
    .toString(HEXBASE);
};

const getHash = (content, options) => {
    if (typeof options.method === 'function') {
        return options.method(content);
    }

    return getxxhash(content, options);
};

module.exports = function(content, options) {
    options = options || defaultHashOptions;

    const hash = getHash(content, options);

    return options.shrink ? hash.substr(0, options.shrink) : hash;
};
