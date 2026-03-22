[![GitHub License](https://img.shields.io/github/license/muze-nl/jsfs)](https://github.com/muze-nl/jsfs/blob/main/LICENSE)
[![GitHub package.json version](https://img.shields.io/github/package-json/v/muze-nl/jsfs)]()
[![NPM Version](https://img.shields.io/npm/v/@muze-nl/jsfs)](https://www.npmjs.com/package/@muze-nl/jsfs)
[![npm bundle size](https://img.shields.io/bundlephobia/min/@muze-nl/jsfs)](https://www.npmjs.com/package/@muze-nl/jsfs)
[![Project stage: Experimental][project-stage-badge: Experimental]][project-stage-page]

# JSFS: a light-weight javascript filesystem abstraction

```javascript
import '@muze-nl/jsfs'

const client = jsfs.fs(
	new jsfs.adapters.https('https://example.org/')
)
```

## Table of Contents
1. [Introduction](#introduction)
2. [Usage](#usage)
3. [Adapters](#adapters)
4. [Contributing](CONTRIBUTING.md)
4. [License](#license)

<a name="introduction"></a>
## Introduction

JSFS is a light-weight filesystem abstraction for javascript, inspired by PHP's Flysystem. Unlike other solutions, like ZenFS, it has a minimal API. Just these functions:

- `cd`
- `read`
- `write`
- `delete`
- `exists`
- `list`

There is no support for streaming reads or writes yet.

<a name="usage"></a>
## Usage

```bash
npm install @muze-nl/jsfs
```

In the browser, using a cdn:

```html
<script src="https://cdn.jsdelivr.net/npm/@muze-nl/jsfs/dist/browser.js"></script>
```

Using ES6 modules, in the browser or Node (or Deno, or...):
```javascript
import '@muze-nl/jsfs'

const client = jsfs.fs(new jsfs.adapters.https('https://example.org/'))
```

<a name="adapters"></a>
## Adapters

Using Adapters, you can connect any filesystem-like API. By default JSFS comes with an HttpAdapter, that fetches HTML pages and parses them to extract filesystem data. Any site that is compatible with Apaches default directory listing will work. Calling `write()` results in a PUT request to the given path. Similarly `delete()` will send a DELETE request. `exists()` will send a HEAD request.

In a separate package, you can get an Adapter written for Solid PODs (see https://solidproject.org/). Check out [@muze-nl/jsfs-solid](https://github.com/muze-nl/jsfs-solid/) for more information.

To write a new Adapter, you must implement this interface:

```javascript
{
	get name()
	get path()
	supportsWrite()
	cd(path)
	async write(path, contents, metadata=null)
	async read(path)
	async exists(path)
	async delete(path)
	async list(path)
}
```

The `list` method must return an array of objects with at least these properties:
```javascript
{
	filename,
	path,
	name
}
```

<a name="license"></a>
## License

This software is licensed under MIT open source license. See the [License](./LICENSE) file.

[project-stage-badge: Experimental]: https://img.shields.io/badge/Project%20Stage-Experimental-yellow.svg
[project-stage-page]: https://blog.pother.ca/project-stages/