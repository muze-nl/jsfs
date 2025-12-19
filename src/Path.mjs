export default class Path {
    #value;

    constructor(path) {
        this.#value = Path.collapse(path);
    }

    get value() {
        return this.#value;
    }

    toString() {
        return this.#value;
    }

    get length() {
        return this.#value.length;
    }

    static collapse(path, cwd='') {
        if (path instanceof Path) {
            return path.value;
        }
        if (typeof path !== 'string' ) {
            throw new TypeError('path argument must be a string or an instance of Path');
        }
        if (cwd && !(cwd instanceof Path)) {
            cwd = new Path(cwd);
        }
        path = path.trim();
        if (path.length===0) {
            return cwd.value;
        }
        if (Path.isRelative(path)) {
            path = cwd+path;
        }
        let pathnames = Path.reduce(path, (result, entry) => {
            if (entry == '..' ) {
                result.pop();
            } else if (entry !== '.') {
                result.push(entry);
            }
            return result;
        }, []);
        let result = '/';
        if (pathnames.length) {
            result += pathnames.join('/');
            if (Path.isFolder(path)) {
                result += '/';
            }
        }
        return result;
    }

    static isAbsolute(path) {
        if (path instanceof Path) {
            return true;
        }
        return path.length && path[0]==='/';
    }

    static isRelative(path) {
        return !Path.isAbsolute(path);    
    }

    static isFolder(path) {
        if (path instanceof Path) {
            path = path.value;
        }
        return path.length && path[path.length-1] == '/';
    }

    static isPath(path) {
        if (path instanceof Path) {
            return true;
        }
        if (typeof path !== 'string') {
            return false;
        }
        path = path.trim();
        let u = new URL(path, document.location);
        return u.pathname == path;
    }

    static reduce(path, reducer, initial) {
        if (path instanceof Path) {
            path = path.value;
        }
        return path.split('/').filter(Boolean).reduce(reducer, initial);
    }

    static map(path, callback) {
        if (path instanceof Path) {
            path = path.value;
        }
        return path.split('/').filter(Boolean).map(callback);
    }

    static parent(path) {
        if (path instanceof Path) {
            path = path.value;
        }
        path = path.split('/').filter(Boolean);
        path.pop();
        let result = '/';
        if (path.length) {
            result += path.join('/')+'/';
        }
        return result;
    }

    static filename(path) {
        if (path instanceof Path) {
            path = path.value;
        }
        return path.split('/').filter(Boolean).pop();
    }
    
    static head(path) {
        if (path instanceof Path) {
            path = path.value;
        }
        return path.split('/').filter(Boolean).shift();
    }
    
    static tail(path) {
        if (path instanceof Path) {
            path = path.value;
        }
        path = path.split('/').filter(Boolean)
        path.shift();
        let result = '/';
        if (path.length) {
            result += path.join('/')+'/';
        }
        return result;
    }

}