# postcss-url [![Build Status](https://travis-ci.org/postcss/postcss-url.png)](https://travis-ci.org/postcss/postcss-url)

> [PostCSS](https://github.com/postcss/postcss) plugin to rebase or inline on url().

## Installation

```console
$ npm install postcss-url
```

## Usage

```js
// dependencies
var fs = require("fs")
var postcss = require("postcss")
var url = require("postcss-url")

// css to be processed
var css = fs.readFileSync("input.css", "utf8")

// process css
var output = postcss()
  .use(url({
    url: "rebase" // or "inline"
  }))
  .process(css, {
    // "rebase" mode need at least one of those options
    // "inline" mode might need `from` option only
    from: "src/stylesheet/index.css"
    to: "dist/index.css"
  })
  .css
```

Checkout [tests](test) for examples.

### Options

#### `url` (default: `"rebase"`)

##### `url: "rebase"`

Allow you to fix `url()` according to postcss `to` and/or `from` options (rebase to `to` first if available, otherwise `from` or `process.cwd()`).

##### `url: "inline"`

Allow you to inline assets using base64 syntax. Can use postcss `from` option to find ressources.

##### `url: {Function}`

Custom transform function. Takes one argument (original url) and should return the transformed url.  
You can use this option to adjust urls for CDN.

#### `maxSize: "size in kbytes"`

Specify the maximum file size to inline

#### `basePath: "basePath for images to inline"`

Specify the basePath from where to search images

---

## Contributing

Work on a branch, install dev-dependencies, respect coding style & run tests before submitting a bug fix or a feature.

```console
$ git clone https://github.com/postcss/postcss-url.git
$ git checkout -b patch-1
$ npm install
$ npm test
```

## [Changelog](CHANGELOG.md)

## [License](LICENSE)
