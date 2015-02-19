# 2.0.2 - 2015-01-31

- Fixed: url that are just hashes are ignored completely ([#25](https://github.com/postcss/postcss-url/issues/25))

# 2.0.1 - 2015-01-31

- Fixed: url with hashes are ignored for inline mode only ([#23](https://github.com/postcss/postcss-url/pull/23))

# 2.0.0 - 2015-01-26

- Added: compatibility with postcss v4.x
- Removed: compatibility with postcss v3.x

# 1.3.1 - 2015-01-26

- Fixed: dependency issue related to "directory-encoder" ([#22](https://github.com/postcss/postcss-url/pull/22))

# 1.3.0 - 2015-01-26

- Changed: SVGs are now in plain text (not base64 encoded) ([3c04f7a](https://github.com/postcss/postcss-url/commit/3c04f7abb1c017dfef34d3ddb00a5b44d8af951f), [#18](https://github.com/postcss/postcss-url/issues/18))
- Fixed: URLs with hashes (e.g. SVG fragments) are now ignored ([c3a9abc](https://github.com/postcss/postcss-url/commit/c3a9abcbed33ede323e7dcd6708b8fdb6168462f), [#20](https://github.com/postcss/postcss-url/pull/20))

# 1.2.3 - 2015-01-10

- Use Node's native buffer.toString("base64"). The js-base64 library was producing incorrect base64 for certain files ([#17](https://github.com/postcss/postcss-url/pull/17))

# 1.2.2 - unpublished

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
