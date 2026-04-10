import Path from './Path.mjs';

export default class FileSystem {
	
	#adapter;
	#path = '/';

	constructor(adapter) {
		this.#adapter = adapter
		this.#path = this.#adapter.path;
	}

	get path() {
		return this.#path;
	}

	cd(path) {
		if (!(path instanceof Path)) {
			path = new Path(Path.collapse(path, this.#path));
		}
		return new FileSystem(this.#adapter.cd(path));
	}

	async read(path, reader = null) {
		if (!(path instanceof Path)) {
			path = new Path(Path.collapse(path, this.#path));
		}
		if (typeof reader === 'function') {
			if (!this.#adapter.supportsStreamingRead()) {
				throw new Error('Adapter '+this.#adapter.name+' does not support streaming reading.');
			}
			return this.#adapter.readStream(path, reader);
		} else {
			return this.#adapter.read(path);
		}
	}

	async write(path, contents, metadata = null) {
		if (!(path instanceof Path)) {
			path = new Path(Path.collapse(path, this.#path));
		}
		if (!this.#adapter.supportsWrite()) {
			throw new Error('Adapter '+this.#adapter.name+' is read only.');
		}
		if (typeof contents === 'function') {
			if (!this.#adapter.supportsStreamingWrite()) {
				throw new Error('Adapter '+this.#adapter.name+' does not support streaming writing.');
			}
			return this.#adapter.writeStream(path, contents, metadata);
		} else if (typeof contents === 'string') {
			return this.#adapter.write(path, contents, metadata);
		} else {
			throw new TypeError('Cannot write contents of type '+(typeof contents));
		}
	}

	async remove(path) {
		if (!(path instanceof Path)) {
			path = new Path(Path.collapse(path, this.#path));
		}
		return this.#adapter.remove(path);
	}

	async exists(path) {
		if (!(path instanceof Path)) {
			path = new Path(Path.collapse(path, this.#path));
		}
		return this.#adapter.exists(path);
	}

	async list(path='') {
		if (!(path instanceof Path)) {
			path = new Path(Path.collapse(path, this.#path));
		}
		return this.#adapter.list(path);
	}

	async mkdir(path='') {
		if (!this.#adapter.supportsWrite()) {
			throw new Error('Adapter '+this.#adapter.name+' is read only.');
		}
		if (!this.#adapter.supportsDirectories) {
			throw new Error('Adapter '+this.#adapter.name+' does not support directories.');
		}
		if (!(path instanceof Path)) {
			path = new Path(Path.collapse(path, this.#path));
		}
		return this.#adapter.mkdir(path);		
	}

	async rmdir(path='') {
		if (!this.#adapter.supportsWrite()) {
			throw new Error('Adapter '+this.#adapter.name+' is read only.');
		}
		if (!this.#adapter.supportsDirectories) {
			throw new Error('Adapter '+this.#adapter.name+' does not support directories.');
		}
		if (!(path instanceof Path)) {
			path = new Path(Path.collapse(path, this.#path));
		}
		return this.#adapter.rmdir(path);
	}
}

