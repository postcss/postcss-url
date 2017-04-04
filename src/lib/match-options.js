'use strict';

const minimatch = require('minimatch');
const path = require('path');

/**
 * Returns whether the given asset matches the given pattern
 * Allways returns true if the given pattern is empty
 *
 * @param {PostcssUrl~Asset} asset the processed asset
 * @param {String|RegExp|Function} pattern A minimatch string,
 *   regular expression or function to test the asset
 *
 * @returns {Boolean}
 */
const matchesFilter = (asset, pattern) => {
    const relativeToRoot = path.relative(process.cwd(), asset.absolutePath);

    if (typeof pattern === 'string') {
        pattern = minimatch.filter(pattern);

        return pattern(relativeToRoot);
    }

    if (pattern instanceof RegExp) {
        return pattern.test(relativeToRoot);
    }

    if (pattern instanceof Function) {
        return pattern(asset);
    }

    return true;
};

/**
 * Matching options by filter property
 *
 * @param {PostcssUrl~Asset} asset
 * @param {PostcssUrl~Options|PostcssUrl~Options[]} options
 * @returns {PostcssUrl~Options|undefined}
 */
const matchOptions = (asset, options) => {
    if (!options) return;

    if (Array.isArray(options)) {
        return options.find((option) => matchesFilter(asset, option.filter));
    }

    if (!matchesFilter(asset, options.filter)) return;

    return options;
};

module.exports = matchOptions;
