'use strict';

const path = require('path');

/**
 * Fix url() according to source (`from`) or destination (`to`)
 *
 * @type {PostcssUrl~UrlProcessor}
 */
module.exports = function (url, dir) {
  let newPath = url;

  if (dir.file !== dir.from) {
    newPath = path.relative(dir.from, dir.file + path.sep + newPath);
  }

  newPath = path.resolve(dir.from, newPath);
  newPath = path.relative(dir.to, newPath);

  if (path.sep === '\\') {
    newPath = newPath.replace(/\\/g, '\/');
  }

  return newPath;
};
