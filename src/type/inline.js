'use strict';

const path = require('path');
const url = require('url');
const fs = require('fs');
const mime = require('mime');
const encodeFile = require("../encode-file");

const processCopy = require('./copy');
const processCustom = require('./custom');

const restoreHash = (content, hash) => hash ? content + hash : content;

/**
 * Inline image in url()
 *
 * @type {PostcssUrl~UrlProcessor}
 */
module.exports = function (originUrl, dir, options, result, decl) {
  let maxSize = options.maxSize === undefined ? 14 : options.maxSize;
  let fallback = options.url;
  let basePath = options.basePath;
  let encodeType = options.encodeType || 'base64';
  let fullFilePath;

  maxSize = maxSize * 1024;

  function processFallback() {
    if (typeof fallback === 'function') {
      options.url = fallback;
      return processCustom(originUrl, dir, options, result, decl);
    }
    switch (fallback) {
    case 'copy':
      return processCopy(originUrl, dir, options, result, decl);
    default:
      return;
    }
  }

  let link = url.parse(originUrl);

  if (basePath) {
    fullFilePath = path.join(basePath, link.pathname);
  } else {
    fullFilePath = dir.file !== dir.from
            ? dir.file + path.sep + link.pathname
            : link.pathname;
  }

  let file = path.resolve(dir.from, fullFilePath);
  if (!fs.existsSync(file)) {
    result.warn('Can\'t read file \'' + file + '\', ignoring', { node: decl });
    return;
  }

  let stats = fs.statSync(file)
  if (stats.size >= maxSize) {
    return processFallback();
  }

  let mimeType = mime.lookup(file);

  // Warn for svg with hashes/fragments
  if (link.hash && mimeType === 'image/svg+xml') {
    result.warn(
      'Image type is svg and link contains #. Postcss-url cant handle svg fragments. ' + file, { node: decl }
    );
  }

  if (!mimeType) {
    result.warn('Unable to find asset mime-type for ' + file, { node: decl });
    return;
  }

  const content = fs.readFileSync(file);
  return restoreHash(encodeFile(content, mimeType, encodeType), link.hash);
};
