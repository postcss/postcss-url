'use strict';

const fs = require('fs');
const mime = require('mime');

const getPathByBasePath = require('./paths').getPathByBasePath;

const readFileAsync = (filePath) => {
    return new Promise((resolve, reject) => {
        fs.readFile(filePath, (err, data) => {
            if (err) {
                reject(err);
            }
            resolve(data);
        });
    });
};

const existFileAsync = (filePath) => {
    return new Promise((resolve, reject) =>
        fs.access(filePath, (err) => {
            if (err) {
                reject();
            }
            resolve(filePath);
        })
    );
};

const oneSuccess = (promises) => {
    return Promise.all(promises.map((p) => {
        return p.then(
            (val) => Promise.reject(val),
            (err) => Promise.resolve(err)
        );
    })).then(
        (errors) => Promise.reject(errors),
        (val) => Promise.resolve(val)
    );
};

/**
 *
 * @param {PostcssUrl~Asset} asset
 * @param {PostcssUrl~Options} options
 * @param {PostcssUrl~Dir} dir
 * @param {Function} warn
 * @returns {Promise<PostcssUrl~File | Undefined>}
 */
const getFile = (asset, options, dir, warn) => {
    const paths = options.basePath
        ? getPathByBasePath(options.basePath, dir.from, asset.pathname)
        : [asset.absolutePath];

    return oneSuccess(paths.map((path) => existFileAsync(path)))
        .then((path) => readFileAsync(path)
            .then((contents) => ({
                path,
                contents,
                mimeType: mime.getType(path)
            })))
        .catch(() => {
            warn(`Can't read file '${paths.join()}', ignoring`);

            return;
        });
};

module.exports = getFile;

/**
 * @typedef {Object} PostcssUrl~File
 * @property {String} path
 * @property {Buffer} contents
 * @property {String} mimeType
 */
