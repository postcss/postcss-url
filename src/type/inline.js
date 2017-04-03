'use strict';

const fs = require('fs');

const processCopy = require('./copy');

const encodeFile = require('../lib/encode');
const getFile = require('../lib/get-file');

/**
 * @param {String} originUrl
 * @param {PostcssUrl~Dir} dir
 * @param {PostcssUrl~Option} options
 *
 * @returns {String|Undefined}
 */
function processFallback(originUrl, dir, options) {
    if (typeof options.fallback === 'function') {
        return options.fallback.apply(null, arguments);
    }
    switch (options.fallback) {
        case 'copy':
            return processCopy.apply(null, arguments);
        default:
            return;
    }
}

/**
 * Inline image in url()
 *
 * @type {PostcssUrl~UrlProcessor}
 * @param {PostcssUrl~Asset} asset
 * @param {PostcssUrl~Dir} dir
 * @param {PostcssUrl~Options} options
 * @param {PostcssUrl~Decl} decl
 * @param {Function} warn
 *
 * @returns {String|Undefined}
 */
module.exports = function(asset, dir, options, decl, warn) {
    const file = getFile(asset, options, dir, warn);

    if (!file) return;

    if (!file.mimeType) {
        warn(`Unable to find asset mime-type for ${file.path}`);

        return;
    }

    const maxSize = (options.maxSize || 0) * 1024;

    if (maxSize) {
        const stats = fs.statSync(file.path);

        if (stats.size >= maxSize) {
            return processFallback.apply(this, arguments);
        }
    }

    const isSvg = file.mimeType === 'image/svg+xml';
    const defaultEncodeType = isSvg ? 'encodeUriComponent' : 'base64';
    const encodeType = options.encodeType || defaultEncodeType;

    // Warn for svg with hashes/fragments
    if (isSvg && asset.hash) {
        // eslint-disable-next-line max-len
        warn(`Image type is svg and link contains #. Postcss-url cant handle svg fragments. SVG file fully inlined. ${file.path}`);
    }

    const encodedStr = encodeFile(file, encodeType);

    return asset.hash ? encodedStr + asset.hash : encodedStr;
};
