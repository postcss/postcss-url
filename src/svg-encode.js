"use strict"

const fs = require("fs")

module.exports = filePath => {
  if (!fs.existsSync(filePath))
    throw new Error("No such file or directory: " + filePath)
  if (fs.statSync(filePath).isDirectory())
    throw new Error("Is a directory (file needed): " + filePath)

  const content = fs.readFileSync(filePath)

  const inlineDecl = "data:image/svg+xml,"
  return inlineDecl + encodeURIComponent(new Buffer(content).toString("utf8"))
        .replace(/%20/g, " ")
        .replace(/#/g, "%23")
        // strip newlines and tabs
        .replace(/[\n\r]/gmi, "")
        .replace(/\t/gmi, " ")
        // strip comments
        .replace(/<\!\-\-(.*(?=\-\->))\-\->/gmi, "")
        // replace
        .replace(/'/gmi, "\\i")
        // encode brackets
        .replace(/\(/g, "%28").replace(/\)/g, "%29")
}
