"use strict"

const xxh = require("xxhashjs")
const crypto = require("crypto")

const HEXBASE=16

module.exports = function(options) {
  let hash

  if (typeof options.method === "function") {
    hash = options.method(options.content)
  }
  else if (options.method.startsWith("xxhash")) {
    const hashFunc = options.method.endsWith(32) ? xxh.h32 : xxh.h64
    const seed = 0

    hash = hashFunc(seed)
            .update(options.content)
            .digest()

    console.log(hash.toString(HEXBASE))

    if (options.format === "hex") {
      hash =  hash.toString(HEXBASE)
    } else throw new Error(`xxhash supports only 'hex' format`)
  }
  else {
    hash = crypto.createHash(options.method)
            .update(options.content)
            .digest(options.format)
  }

  options.shrink && (hash = hash.substr(0, options.shrink))

  return hash
}
