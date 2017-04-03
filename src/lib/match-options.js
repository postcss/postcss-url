'use strict';

const minimatch = require('minimatch');

/**
 * Returns wether the given filename matches the given pattern
 * Allways returns true if the given pattern is empty
 *
 * @param {String} filename the processed filename
 * @param {String|RegExp|Function} pattern A minimatch string,
 *   regular expression or function to test the filename
 *
 * @returns {Boolean}
 */
const matchesFilter = (filename, pattern) => {
    if (typeof pattern === 'string') {
        pattern = minimatch.filter(pattern);
    }

    if (pattern instanceof RegExp) {
        return pattern.test(filename);
    }

    if (pattern instanceof Function) {
        return pattern(filename);
    }

    return true;
};

/**
 * Matching options by filter property
 *
 * @param {String} filepath - relative to project (process.cwd) asset path
 * @param {PostcssUrl~Options|PostcssUrl~Options[]} options
 * @returns {PostcssUrl~Options|undefined}
 */
const matchOptions = (filepath, options) => {
    if (!options) return;

    if (Array.isArray(options)) {
        return options.find((option) => matchesFilter(filepath, option.filter));
    }

    if (!matchesFilter(filepath, options.filter)) return;

    return options;
};

module.exports = matchOptions;
