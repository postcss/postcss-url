'use strict';

const path = require('path');
const calcHash = require('../calc-hash');
const url = require('url');
const fs = require('fs');
const pathIsAbsolute = require('path-is-absolute');
const mkdirp = require('mkdirp');

/**
 * Copy images from readed from url() to an specific assets destination
 * (`assetsPath`) and fix url() according to that path.
 * You can rename the assets by a hash or keep the real filename.
 *
 * Option assetsPath is require and is relative to the css destination (`to`)
 *
 * @type {PostcssUrl~UrlProcessor}
 */
module.exports = function processCopy(originUrl, dir, options, result, decl) {
  if (dir.from === dir.to) {
    result.warn('Option `to` of postcss is required, ignoring', { node: decl });
    return;
  }
  let relativeAssetsPath = (options && options.assetsPath)
        ? options.assetsPath
        : '';
  let absoluteAssetsPath;

  let filePathUrl = path.resolve(dir.file, originUrl);
  let nameUrl = path.basename(filePathUrl);

  // remove hash or parameters in the url.
  // e.g., url('glyphicons-halflings-regular.eot?#iefix')
  let fileLink = url.parse(originUrl);
  let filePath = path.resolve(dir.file, fileLink.pathname);
  let name = path.basename(filePath);
  let useHash = options.useHash || false;

  // check if the file exist in the source
  try {
    var contents = fs.readFileSync(filePath)
  } catch (err) {
    result.warn('Can\'t read file \'' + filePath + '\', ignoring', { node: decl });
    return;
  }

  if (useHash) {
    absoluteAssetsPath = path.resolve(dir.to, relativeAssetsPath);

    // create the destination directory if it not exist
    mkdirp.sync(absoluteAssetsPath);

    let hashOptions = options.hashOptions || {
      method: "xxhash32",
      shrink: 8
    }

    name = calcHash(contents, hashOptions) + path.extname(filePath);

    nameUrl = name + (fileLink.search || '') + (fileLink.hash || '');
  } else {
    if (!pathIsAbsolute.posix(dir.from)) {
      dir.from = path.resolve(dir.from);
    }
    relativeAssetsPath = path.join(
            relativeAssetsPath,
            dir.file.replace(new RegExp(dir.from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
                + '[\/]\?'), ''),
            path.dirname(originUrl)
        );
    absoluteAssetsPath = path.resolve(dir.to, relativeAssetsPath);

        // create the destination directory if it not exist
    mkdirp.sync(absoluteAssetsPath);
  }

  absoluteAssetsPath = path.join(absoluteAssetsPath, name);

    // if the file don't exist in the destination, create it.
  try {
    fs.accessSync(absoluteAssetsPath);
  } catch (err) {
    fs.writeFileSync(absoluteAssetsPath, contents);
  }

  let assetPath = path.join(relativeAssetsPath, nameUrl);
  if (path.sep === '\\') {
    assetPath = assetPath.replace(/\\/g, '\/');
  }
  return assetPath;
};
