import Path from '../Path.mjs';

export default class FileSystemAdapter {
    
    #root;
    #path;
    #exceptionHandler;
    #fetchParams;

    constructor(path='/', exceptionHandler=null, fetchParams={}) {
        if (Navigator?.storage?.getDirectory) {
            this.#root = Navigator.storage.getDirectory();
        } else if (WorkerNavigator?.storage?.getDirectory) {
            this.#root = WorkerNavigator.storage.getDirectory()
        } else {
            throw new Error('Navigator.storage is not supported')
        }
        this.#path = new Path(path);
        this.#exceptionHandler = exceptionHandler;
        this.#fetchParams = fetchParams;
    }

    get name() {
        return 'FileSystemAdapter';
    }

    get path() {
        return this.#path;
    }

    supportsWrite() {
        return true;
    }

    supportsStreamingWrite() {
        const draftFile = await this.#root.getFileHandle("Draft.txt");
        return  !!draftFile.createWritable;
    }

    supportsStreamingRead() {
        return true;
    }

    cd(path) {
        if (!Path.isPath(path)) {
            throw new TypeError(path+' is not a valid path');
        }
        path = Path.collapse(path, this.#path)
        return new FileSystemAdapter(path);
    }

    //FIXME: return a jsfs result object instead of http response
    async write(path, contents, metadata=null) {
    }

    writeStream(path, writer, metadata=null) {
        throw new Error('Not yet implemented')
    }

    async read(path) {
    }

    readStream(path, reader) {
        throw new Error('Not yet implemented')
    }

    async exists(path) {
    }

    async delete(path) {
    }

    async list(path) {
        path = Path.collapse(path, this.#path);
        let dir = this.cd(path)
        let result = []
        for await (const handle of dir.values()) {
            result.push({
                filename: handle.name,
                path: 
                type: handle.
            })
    if (handle.kind == "directory") {
        directoryNames.push(handle.name);
    }
}
            return {
                filename: Path.filename(link.pathname),
                path: link.pathname,
                name: link.innerText,
                href: link.href
            }
        .map(link => {
            return {
                filename: link.filename,
                path: link.path.substring(basePath.length-1), //TODO: Path.collapse() now always adds a trailing '/', so this works, but the added trailing / is probably not correct
                name: link.name
            }
        })
    }

}