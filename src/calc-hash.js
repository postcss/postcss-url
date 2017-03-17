"use strict"

const xxh = require("xxhashjs")
const HEXBASE = 16

function getHash(content, options) {
  if (typeof options.method === "function") {
    return options.method(content)
  }
  
  if (options.method.startsWith("xxhash")) {
    return getxxhash(content, options)
  }

  throw new Error(`unsupported hash function`)  
}

function getxxhash(content, options) {
    const hashFunc = options.method.endsWith(32) ? xxh.h32 : xxh.h64
    const seed = 0

    return hashFunc(seed)
      .update(content)
      .digest()
      .toString(HEXBASE)
}

module.exports = function(content, options) {
  let hash = getHash(content, options)

  options.shrink && (hash = hash.substr(0, options.shrink))

  return hash
}
