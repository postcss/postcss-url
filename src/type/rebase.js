'use strict';

const path = require('path');
const normalize = require('../lib/paths').normalize;

/**
 * Fix url() according to source (`from`) or destination (`to`)
 *
 * @type {PostcssUrl~UrlProcessor}
 * @param {PostcssUrl~Asset} asset
 * @param {PostcssUrl~Dir} dir
 *
 * @returns {String|Undefined}
 */
module.exports = function(asset, dir) {
    const rebasedUrl = normalize(
        path.relative(dir.to, asset.absolutePath)
    );

    return `${rebasedUrl}${asset.search}${asset.hash}`;
};
