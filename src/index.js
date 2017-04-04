'use strict';

const path = require('path');
const postcss = require('postcss');

const paths = require('./lib/paths');

const getDirDeclFile = paths.getDirDeclFile;
const prepareAsset = paths.prepareAsset;
const isUrlShouldBeIgnored = paths.isUrlShouldBeIgnored;

const matchOptions = require('./lib/match-options');

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

/**
 * Restricted modes
 *
 * @type {String[]}
 */
const PROCESS_TYPES = ['rebase', 'inline', 'copy', 'custom'];

/**
 * @param {String} mode=copy|custom|inline|rebase
 * @returns {PostcssUrl~UrlProcessor}
 */
function getUrlProcessor(mode) {
    if (~PROCESS_TYPES.indexOf(mode)) {
        return require(`./type/${mode}`);
    }
    throw new Error(`Unknown mode for postcss-url: ${mode}`);
}

/**
 * @param {Decl} decl
 * @returns {RegExp}
 */
const getPattern = (decl) =>
    URL_PATTERNS.find((pattern) => pattern.test(decl.value));

/**
 * @param {String} url
 * @param {Dir} dir
 * @param {Options} options
 * @param {Result} result
 * @param {Decl} decl
 * @returns {String|undefined}
 */
const replaceUrl = (url, dir, options, result, decl) => {
    const asset = prepareAsset(url, dir, decl);
    const relativeToRoot = path.relative(process.cwd(), asset.absolutePath);

    const matchedOptions = matchOptions(relativeToRoot, options);

    if (!matchedOptions) return;

    const isFunction = typeof matchedOptions.url === 'function';

    if (!isFunction && isUrlShouldBeIgnored(url, matchedOptions)) return;

    const mode = isFunction ? 'custom' : (matchedOptions.url || 'rebase');
    const urlProcessor = getUrlProcessor(mode);
    const warn = (message) => decl.warn(result, message);

    return urlProcessor(asset, dir, matchedOptions, decl, warn, result);
};

/**
 * @param {PostcssUrl~Options} options
 * @param {Result} result
 * @param {PostcssUrl~Dir} dir
 * @param {Decl} decl
 * @returns {PostcssUrl~DeclProcessor}
 */
const declProcessor = (options, result, dir, decl) => {
    const pattern = getPattern(decl);

    if (!pattern) return;

    decl.value = decl.value
        .replace(pattern, (matched, before, url, after) => {
            const newUrl = replaceUrl(url, dir, options, result, decl);

            return newUrl ? `${before}${newUrl}${after}` : matched;
        });
};

/**
 *
 * @type {Plugin}
 */
module.exports = postcss.plugin('postcss-url', (options) => {
    options = options || {};

    return function(styles, result) {
        const opts = result.opts;
        const from = opts.from ? path.dirname(opts.from) : '.';
        const to = opts.to ? path.dirname(opts.to) : from;

        styles.walkDecls((decl) => {
            const dir = { from, to, file: getDirDeclFile(decl) };

            return declProcessor(options, result, dir, decl);
        });
    };
});

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
 * @typedef {Object} PostcssUrl~Options - postcss-url Options
 * @property {String} [url=^rebase|inline|copy|custom] - processing mode
 * @property {Minimatch|RegExp|Function} [filter] - filter assets by relative pathname
 * @property {String} [assetsPath] - absolute or relative path to copy assets
 * @property {String|String[]} [basePath] - absolute or relative paths to search, when copy or inline
 * @property {Number} [maxSize] - max file size in kbytes for inline mode
 * @property {String} [fallback] - fallback mode if file exceeds maxSize
 * @property {Boolean} [useHash] - use file hash instead filename
 * @property {HashOptions} [hashOptions] - params for generating hash name
 */

/**
 * @typedef {Object} PostcssUrl~HashOptions
 * @property {Function|String} [method=^xxhash32|xxhash64] - hash name or custom function, accepting file content
 * @see https://github.com/pierrec/js-xxhash
 * @property {Number} [shrink=8] - shrink hash string
 */

/**
 * @typedef {Object} Decl - postcss decl
 * @see http://api.postcss.org/Declaration.html
 */

/**
 * @typedef {Object} Result - postcss result
 * @see http://api.postcss.org/Result.html
 */
