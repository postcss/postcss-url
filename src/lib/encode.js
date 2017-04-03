'use strict';

/**
 * Encoding file contents to string
 *
 * @param {PostcssUrl~File} file
 * @param {String} [encodeType=base64|encodeURI|encodeURIComponent]
 * @returns {string}
 */
module.exports = (file, encodeType) => {
    const inlineDecl = `data:${file.mimeType}`;

    if (encodeType === 'base64') {
        return `${inlineDecl};base64,${file.contents.toString('base64')}`;
    }

    const encodeFunc = encodeType === 'encodeURI' ? encodeURI : encodeURIComponent;

    return `${inlineDecl},${encodeFunc(file.contents.toString('utf8'))
        .replace(/%20/g, ' ')
        .replace(/#/g, '%23')}`;
};
