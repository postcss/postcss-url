"use strict"

const fs = require("fs")

module.exports = (content, mimeType, encodeType) => {
  const inlineDecl = `data:${mimeType}`;

  if (encodeType === 'base64') {
    return inlineDecl + ';base64,' + new Buffer(content).toString('base64');
  }

  const encodeFunc = encodeType === 'encodeURI' ? encodeURI : encodeURIComponent;

  return inlineDecl + ',' + encodeFunc(new Buffer(content).toString("utf8"))
        .replace(/%20/g, ' ')
        .replace(/#/g, "%23");
}
