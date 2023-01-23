# webpmux-bin

> This is a bin wrapper for **libwebp**'s [webpmux](https://developers.google.com/speed/webp/docs/webpmux).<br>
> **`webpmux`** -- Create animated WebP files from non-animated WebP images, extract frames from animated WebP images, and manage XMP/EXIF metadata and ICC profile.

## Install

```sh
npm install webpmux-bin
```

### Use a different version of `libwebp`
By default, **webpmux-bin** uses the webpmux binary from the **libwebp** version specified in its `package.json` (see `libwebp_version` key).

But if you want, you can force this package to use another version of libwebp at the time you `npm install` it.

To do so, add the version to use to your `package.json` _**before**_ running `npm install webpmux`:
```json
{
    "libwebp_version": "1.3.0"
}
```
_* Can be a specific version or `"latest"`._

## Usage

```js
import {execFile} from 'node:child_process'
import webpmux from 'webpmux-bin'

execFile(webpmux, [
  '-strip', 'exif',
  'input.webp',
  '-o', 'output.webp',
], error => {
  if (error) throw error

  console.log('Image created!')
})
```

## CLI

```sh
npm install --global webpmux-bin
```

```sh
webpmux -help
```

## `webpmux` options
All command-line arguments are documented [here](https://developers.google.com/speed/webp/docs/webpmux).

## Credits

* This package is made by [Philip van Heemstra](https://github.com/vHeemstra)
* [**webpmux**](https://developers.google.com/speed/webp/docs/webpmux) is part of **libwebp**, and was written by the WebP team.<br>The latest source tree is available at [https://chromium.googlesource.com/webm/libwebp/](https://chromium.googlesource.com/webm/libwebp/)
