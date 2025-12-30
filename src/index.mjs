import JSFS from './FileSystem.mjs'
import HttpAdapter from './Adapters/Http.mjs'
import Path from './Path.mjs'

const jsfs = {
	fs: JSFS,
	adapters: {
		https: HttpAdapter
	},
	path: Path
}
globalThis.jsfs = jsfs

export default jsfs