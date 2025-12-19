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
window.jsfs = jsfs

export default jsfs