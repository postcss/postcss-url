'use strict';

/**
 * Module dependencies.
 */
const path = require('path');

const postcss = require('postcss');
const url = require('url');
const minimatch = require('minimatch');
/**
 * @typedef UrlRegExp
 * @name UrlRegExp
 * @desc A regex for match url with parentheses:
 *   (before url)(the url)(after url).
 *    (the url) will be replace with new url, and before and after will remain
 * @type RegExp
 */
/**
 * @type {UrlRegExp[]}
 */
const URL_PATTERNS = [
    /(url\(\s*['"]?)([^"')]+)(["']?\s*\))/g,
    /(AlphaImageLoader\(\s*src=['"]?)([^"')]+)(["'])/g
];
const PROCESS_TYPES = [
    'rebase',
    'inline',
    'copy',
    'custom'
];
/**
 * Fix url() according to source (`from`) or destination (`to`)
 *
 * @param {Object} options plugin options
 * @return {void}
 */
module.exports = postcss.plugin(
    'postcss-url',
    function fixUrl(options) {
        options = options || {};

        return function(styles, result) {
            const cb = getDeclProcessor(options, result);

            styles.walkDecls(cb);
        };
    }
);

/**
 * @callback PostcssUrl~UrlProcessor
 * @param {String} from from
 * @param {String} dirname to dirname
 * @param {String} oldUrl url
 * @param {String} to destination
 * @param {Object} options plugin options
 * @param {Object} decl postcss declaration
 * @return {String|undefined} new url or undefined if url is old
 */

/**
 * @param {String} mode
 * @returns {PostcssUrl~UrlProcessor}
 */
function getUrlProcessor(mode) {
    if (~PROCESS_TYPES.indexOf(mode)) {
        return require(`./type/${mode}`);
    }
    throw new Error('Unknown mode for postcss-url: ' + mode);
}

/**
 * @callback PostcssUrl~DeclProcessor
 * @param {Object} decl declaration
 */

/**
 * @param {Object} options
 * @param {Object} result
 * @returns {PostcssUrl~DeclProcessor}
 */
function getDeclProcessor(options, result) {
    const from = result.opts.from
        ? path.dirname(result.opts.from)
        : ".";
    const to = result.opts.to
        ? path.dirname(result.opts.to)
        : from;

    return function(decl) {
        URL_PATTERNS.some(function(pattern) {
            if (!pattern.test(decl.value)) {
                return;
            }

            decl.value = decl.value
                .replace(pattern, function(_, beforeUrl, url, afterUrl) {
                    return beforeUrl +
                        (replaceUrl(url, from, to, options, result, decl) || url) +
                        afterUrl;
                });

            return true;
        });
    };
}

function replaceUrl(url, from, to, options, result, decl) {
    if (typeof options.url !== 'function' && isUrlShouldBeIgnored(url)) {
        return;
    }

    if (Array.isArray(options)) {
        options = options.find(option =>
            matchesFilter(url, option.filter)
        );
    }

    if (!options || !matchesFilter(url, options.filter)) {
        return
    }
    const mode = typeof options.url === 'function' ?
        'custom' :
        options.url;
    const urlProcessor = getUrlProcessor(mode || 'rebase');
    const dir = {
        file: getDeclDirname(decl),
        from: from,
        to: to
    };

    return urlProcessor(url, dir, options, result, decl);
};

const getDeclFilename = (decl) =>
    decl.source && decl.source.input && decl.source.input.file;

const getDeclDirname = (decl) => {
    const filename = getDeclFilename(decl);

    return filename ? path.dirname(filename) : process.cwd();
};

/**
 * Check if url is absolute, hash or data-uri
 * @param {String} url
 * @returns {boolean}
 */
function isUrlShouldBeIgnored(url) {
    return url[0] === '#' ||
        url.substring(0, 3) === '%23' ||
        url[0] === '/' ||
        url.indexOf('data:') === 0 ||
        /^[a-z]+:\/\//.test(url);
}

/**
 * Returns wether the given filename matches the given pattern
 * Allways returns true if the given pattern is empty
 *
 * @param {String} filename the processed filename
 * @param {String|RegExp|Function} pattern A minimatch string,
 *   regular expression or function to test the filename
 *
 * @return {Boolean}
 */
function matchesFilter(filename, pattern) {
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
}
