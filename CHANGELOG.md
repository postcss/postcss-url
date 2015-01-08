# 1.2.2 - 2015-01-08

- Use Node's native buffer.toString("base64")
  The js-base64 library was producing incorrect base64 for certain files

# 1.2.1 - 2014-12-09

- Data URIs are ignored correctly ([#15](https://github.com/postcss/postcss-url/pull/15))

# 1.2.0 - 2014-12-04

- `url` now accept a function to allow custom transformation of the url string
- All absolute url protocols are now ignored (not just /https?/).

# 1.1.3 - 2014-12-04

- Fix absolute urls being mangled ([#13](https://github.com/postcss/postcss-url/issues/13))

# 1.1.2 - 2014-11-08

- Fix MaxSize issue ([#9](https://github.com/postcss/postcss-url/issues/9))

# 1.1.1 - 2014-10-30

- Fix bug which leads to not correct base64 code

# 1.1.0 - 2014-10-29

- Add `maxSize` (size in kbytes) and `basePath` (base path for images to inline) options for _inline_ mode.

# 1.0.2 - 2014-10-10

- Fix non-working base64 encoding

# 1.0.1 - 2014-10-09

- Fix paths for Windows ([#3](https://github.com/postcss/postcss-url/issue/3) via [#4](https://github.com/postcss/postcss-url/pull/4))

# 1.0.0 - 2014-08-24

First release
