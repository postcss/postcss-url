'use strict';

const path = require('path');
const normalize = require('../lib/paths').normalize;

/**
 * Fix url() according to source (`from`) or destination (`to`)
 *
 * @type {PostcssUrl~UrlProcessor}
 * @param {PostcssUrl~Asset} asset
 * @param {PostcssUrl~Dir} dir
 * @param {PostcssUrl~Option} options
 *
 * @returns {String|Undefined}
 */
module.exports = function(asset, dir, options) {
    const rebasedUrl = normalize(
        path.relative(dir.to, asset.absolutePath)
    );
    const relative = options.relative ? './' : '';

    return `${relative}${rebasedUrl}${asset.search}${asset.hash}`;
};
