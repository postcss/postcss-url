/**
 * Transform url() based on a custom callback
 *
 * @param {Function} cb callback function
 * @return {PostcssUrl~UrlProcessor}
 */
module.exports = function getCustomProcessor(url, dir, options, result, decl) {
    return options.url(url, dir, options, result, decl);
};
