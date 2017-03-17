'use strict';

const path = require('path');
const url = require('url');
const fs = require('fs');
const mime = require('mime');
const svgEncode = require("../svg-encode");

const processCopy = require('./copy');
const processCustom = require('./custom');
/**
 * Inline image in url()
 *
 * @type {PostcssUrl~UrlProcessor}
 */
module.exports = function (originUrl, dir, options, result, decl) {
  let maxSize = options.maxSize === undefined ? 14 : options.maxSize;
  let fallback = options.fallback;
  let basePath = options.basePath;
  let fullFilePath;

  maxSize = maxSize * 1024;

  function processFallback() {
    if (typeof fallback === 'function') {
      return processCustom(fallback)(dir.from, dir.to, options, result);
    }
    switch (fallback) {
    case 'copy':
      return processCopy(dir.from, dir.to, options, result);
    default:
      return;
    }
  }

    // ignore URLs with hashes/fragments, they can't be inlined
  let link = url.parse(originUrl);
  if (link.hash) {
    return processFallback();
  }

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

  let stats = fs.statSync(file);

  if (stats.size >= maxSize) {
    return processFallback();
  }

  let mimeType = mime.lookup(file);

  if (!mimeType) {
    result.warn('Unable to find asset mime-type for ' + file, { node: decl });
    return;
  }
  if (mimeType === 'image/svg+xml') {
    return svgEncode(file);
  }

  file = fs.readFileSync(file);
  return 'data:' + mimeType + ';base64,' + file.toString('base64');
};
