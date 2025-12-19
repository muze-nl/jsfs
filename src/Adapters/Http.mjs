import Path from '../Path.mjs';
import { client, url } from '@muze-nl/metro/src/metro.mjs'

export default class HttpAdapter {
    
    #client;
    #path;

    constructor(metroClient, path='/') {
        this.#client = client(metroClient)
        this.#path = new Path(path);
    }

    get name() {
        return 'HttpAdapter';
    }

    get path() {
        return this.#path;
    }

    supportsWrite() {
        return true;
    }

    supportsStreamingWrite() {
        return supportsRequestStreams;
    }

    supportsStreamingRead() {
        return true;
    }

    cd(path) {
        if (!Path.isPath(path)) {
            throw new TypeError(path+' is not a valid path');
        }
        if (Path.isRelative(path)) {
            path = Path.collapse(path, this.#path)
        }
        return new this.constructor(this.#client, path);
    }

    //FIXME: return a jsfs result object instead of http response
    async write(path, contents, metadata=null) {
        return this.#client.put({body: contents})
    }

    writeStream(path, writer, metadata=null) {
        throw new Error('Not yet implemented')
    }

    async read(path) {
        let response = await this.#client.get(path);
        //TODO: create a special jsfsFile class
        //with a toString that returns the contents
        //or better: mimic the File class of the browser
        let result = {
            type: this.#getMimetype(response),
            name: Path.filename(path),
            http: {
                headers: response.headers,
                status: response.status,
                url: response.url
            }
        }
        //TODO: add middleware in metro client for this
        if (result.type.match(/text\/.*/)) {
            result.contents = await response.text()
        } else if (result.type.match(/application\/json.*/)) {
            result.contents = await response.json()
        } else {
            result.contents = await response.blob()
        }
        return result
    }

    readStream(path, reader) {
        throw new Error('Not yet implemented')
    }

    async exists(path) {
        return this.#client.head(path);
    }

    async delete(path) {
        return this.#client.delete(path);
    }

    async list(path) {
        let supportedContentTypes = [
            'text/html','text/xhtml','text/xhtml+xml','text/xml'
        ];
        let result = await this.read(path)
        if (supportedContentTypes.includes(result.type.split(';')[0])) {
            var html = result.contents
        } else {
            let url = this.#getUrl(path);
            throw new TypeError('URL '+url+' is not of a supported content type', {
                cause: result
            });                
        }

        let basePath = url(this.#client.clientOptions.url).pathname;
        let parentUrl = this.#getUrl(path);
        // TODO: use DOMParser() directly here
        let dom = document.createElement('template');
        dom.innerHTML = html;
        let links = dom.content.querySelectorAll('a[href]');

        return Array.from(links)
        .map(link => {
            // use getAttribute to get the unchanged href value
            // otherwise relative hrefs will be turned into absolute values relative to the current window.location
            // instead of the path used in list()
            let url = new URL(link.getAttribute('href'), parentUrl.href); 
            link.href = url.href;
            return {
                filename: Path.filename(link.pathname),
                path: link.pathname,
                name: link.innerText,
                href: link.href
            }
        })
        .filter(link => {
            // show only links that have the current URL as direct parent
            let testURL = new URL(link.href)
            testURL.pathname = Path.parent(testURL.pathname);
            return testURL.href===parentUrl.href;
        })
        .map(link => {
            return {
                filename: link.filename,
                path: link.path.substring(basePath.length-1), //TODO: Path.collapse() now always adds a trailing '/', so this works, but the added trailing / is probably not correct
                name: link.name
            }
        })
    }

    #getUrl(path) {
        let basePath = url(this.#client.clientOptions.url).pathname;
        path = Path.collapse(basePath + Path.collapse(path));
        return new URL(path, this.#client.clientOptions.url);
    }

    #getMimetype(response) {
        if (response.headers.has('Content-Type')) {
            return response.headers.get('Content-Type')
        } else {
            return null
        }
    }
}

const supportsRequestStreams = (async () => {
    const supportsStreamsInRequestObjects = !new Request(
        '', 
        {
            body: new ReadableStream(),
            method: 'POST',
            duplex: 'half' // required in chrome
        }
    )
    .headers.has('Content-Type');

    if (!supportsStreamsInRequestObjects) {
        return false;
    }

    return fetch(
        'data:a/a;charset=utf-8,', 
        {
            method: 'POST',
            body: new ReadableStream(),
            duplex: 'half'
        }
    )
    .then(() => true, () => false);
})();