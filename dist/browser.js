(() => {
  // src/Path.mjs
  var Path = class _Path {
    #value;
    constructor(path) {
      this.#value = _Path.collapse(path);
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
    static collapse(path, cwd = "") {
      if (path instanceof _Path) {
        return path.value;
      }
      if (typeof path !== "string") {
        throw new TypeError("path argument must be a string or an instance of Path");
      }
      if (cwd && !(cwd instanceof _Path)) {
        cwd = new _Path(cwd);
      }
      path = path.trim();
      if (path.length === 0) {
        return cwd.value;
      }
      if (_Path.isRelative(path)) {
        path = cwd + path;
      }
      let pathnames = _Path.reduce(path, (result2, entry) => {
        if (entry == "..") {
          result2.pop();
        } else if (entry !== ".") {
          result2.push(entry);
        }
        return result2;
      }, []);
      let result = "/";
      if (pathnames.length) {
        result += pathnames.join("/");
        if (_Path.isFolder(path)) {
          result += "/";
        }
      }
      return result;
    }
    static isAbsolute(path) {
      if (path instanceof _Path) {
        return true;
      }
      return path.length && path[0] === "/";
    }
    static isRelative(path) {
      return !_Path.isAbsolute(path);
    }
    static isFolder(path) {
      if (path instanceof _Path) {
        path = path.value;
      }
      return path.length && path[path.length - 1] == "/";
    }
    static isPath(path) {
      if (path instanceof _Path) {
        return true;
      }
      if (typeof path !== "string") {
        return false;
      }
      path = path.trim();
      let u = new URL(path, document.location);
      return u.pathname == path;
    }
    static reduce(path, reducer, initial) {
      if (path instanceof _Path) {
        path = path.value;
      }
      return path.split("/").filter(Boolean).reduce(reducer, initial);
    }
    static map(path, callback) {
      if (path instanceof _Path) {
        path = path.value;
      }
      return path.split("/").filter(Boolean).map(callback);
    }
    static parent(path) {
      if (path instanceof _Path) {
        path = path.value;
      }
      path = path.split("/").filter(Boolean);
      path.pop();
      let result = "/";
      if (path.length) {
        result += path.join("/") + "/";
      }
      return result;
    }
    static filename(path) {
      if (path instanceof _Path) {
        path = path.value;
      }
      return path.split("/").filter(Boolean).pop();
    }
    static head(path) {
      if (path instanceof _Path) {
        path = path.value;
      }
      return path.split("/").filter(Boolean).shift();
    }
    static tail(path) {
      if (path instanceof _Path) {
        path = path.value;
      }
      path = path.split("/").filter(Boolean);
      path.shift();
      let result = "/";
      if (path.length) {
        result += path.join("/") + "/";
      }
      return result;
    }
  };

  // src/FileSystem.mjs
  var FileSystem = class _FileSystem {
    #adapter;
    #path = "/";
    constructor(adapter) {
      this.#adapter = adapter;
      this.#path = this.#adapter.path;
    }
    get path() {
      return this.#path;
    }
    cd(path) {
      if (!(path instanceof Path)) {
        path = new Path(Path.collapse(path, this.#path));
      }
      return new _FileSystem(this.#adapter.cd(path));
    }
    async read(path, reader = null) {
      if (!(path instanceof Path)) {
        path = new Path(Path.collapse(path, this.#path));
      }
      if (typeof reader === "function") {
        if (!this.#adapter.supportsStreamingRead()) {
          throw new Error("Adapter " + this.#adapter.name + " does not support streaming reading.");
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
        throw new Error("Adapter " + this.#adapter.name + " is read only.");
      }
      if (typeof contents === "function") {
        if (!this.#adapter.supportsStreamingWrite()) {
          throw new Error("Adapter " + this.#adapter.name + " does not support streaming writing.");
        }
        return this.#adapter.writeStream(path, contents, metadata);
      } else if (typeof contents === "string") {
        return this.#adapter.write(path, contents, metadata);
      } else {
        throw new TypeError("Cannot write contents of type " + typeof contents);
      }
    }
    async delete(path) {
      if (!(path instanceof Path)) {
        path = new Path(Path.collapse(path, this.#path));
      }
      return this.#adapter.delete(path);
    }
    async exists(path) {
      if (!(path instanceof Path)) {
        path = new Path(Path.collapse(path, this.#path));
      }
      return this.#adapter.exists(path);
    }
    async list(path = "") {
      if (!(path instanceof Path)) {
        path = new Path(Path.collapse(path, this.#path));
      }
      return this.#adapter.list(path);
    }
  };

  // node_modules/@muze-nl/metro/src/metro.mjs
  var metroURL = "https://metro.muze.nl/details/";
  if (!Symbol.metroProxy) {
    Symbol.metroProxy = Symbol("isProxy");
  }
  if (!Symbol.metroSource) {
    Symbol.metroSource = Symbol("source");
  }
  var Client = class _Client {
    clientOptions = {
      url: typeof window != "undefined" ? url(window.location) : url("https://localhost"),
      verbs: ["get", "post", "put", "delete", "patch", "head", "options", "query"]
    };
    static tracers = {};
    /**
     * @typedef {Object} ClientOptions
     * @property {Array} middlewares - list of middleware functions
     * @property {string|URL} url - default url of the client
     * @property {[string]} verbs - a list of verb methods to expose, e.g. ['get','post']
     * 
     * Constructs a new metro client. Can have any number of params.
     * @params {ClientOptions|URL|Function|Client}
     * @returns {Client} - A metro client object with given or default verb methods
     */
    constructor(...options) {
      for (let option of options) {
        if (typeof option == "string" || option instanceof String) {
          this.clientOptions.url = url(this.clientOptions.url.href, option);
        } else if (option instanceof Function) {
          this.#addMiddlewares([option]);
        } else if (option && typeof option == "object") {
          for (let param in option) {
            if (param == "middlewares") {
              this.#addMiddlewares(option[param]);
            } else if (param == "url") {
              this.clientOptions.url = url(this.clientOptions.url.href, option[param]);
            } else if (typeof option[param] == "function") {
              this.clientOptions[param] = option[param](this.clientOptions[param], this.clientOptions);
            } else {
              this.clientOptions[param] = option[param];
            }
          }
        }
      }
      for (const verb of this.clientOptions.verbs) {
        this[verb] = async function(...options2) {
          return this.fetch(request(
            this.clientOptions,
            ...options2,
            { method: verb.toUpperCase() }
          ));
        };
      }
    }
    #addMiddlewares(middlewares) {
      if (typeof middlewares == "function") {
        middlewares = [middlewares];
      }
      let index = middlewares.findIndex((m) => typeof m != "function");
      if (index >= 0) {
        throw metroError("metro.client: middlewares must be a function or an array of functions " + metroURL + "client/invalid-middlewares/", middlewares[index]);
      }
      if (!Array.isArray(this.clientOptions.middlewares)) {
        this.clientOptions.middlewares = [];
      }
      this.clientOptions.middlewares = this.clientOptions.middlewares.concat(middlewares);
    }
    /**
     * Mimics the standard browser fetch method, but uses any middleware installed through
     * the constructor.
     * @param {Request|string|Object} - Required. The URL or Request object, accepts all types that are accepted by metro.request
     * @param {Object} - Optional. Any object that is accepted by metro.request
     * @return {Promise<Response|*>} - The metro.response to this request, or any other result as changed by any included middleware.
     */
    fetch(req, options) {
      req = request(req, options);
      if (!req.url) {
        throw metroError("metro.client." + req.method.toLowerCase() + ": Missing url parameter " + metroURL + "client/fetch-missing-url/", req);
      }
      if (!options) {
        options = {};
      }
      if (!(typeof options === "object") || options instanceof String) {
        throw metroError("metro.client.fetch: Invalid options parameter " + metroURL + "client/fetch-invalid-options/", options);
      }
      const metrofetch = async function browserFetch(req2) {
        if (req2[Symbol.metroProxy]) {
          req2 = req2[Symbol.metroSource];
        }
        const res = await fetch(req2);
        return response(res);
      };
      let middlewares = [metrofetch].concat(this.clientOptions?.middlewares?.slice() || []);
      options = Object.assign({}, this.clientOptions, options);
      let next;
      for (let middleware of middlewares) {
        next = /* @__PURE__ */ (function(next2, middleware2) {
          return async function(req2) {
            let res;
            let tracers = Object.values(_Client.tracers);
            for (let tracer of tracers) {
              if (tracer.request) {
                tracer.request.call(tracer, req2, middleware2);
              }
            }
            res = await middleware2(req2, next2);
            for (let tracer of tracers) {
              if (tracer.response) {
                tracer.response.call(tracer, res, middleware2);
              }
            }
            return res;
          };
        })(next, middleware);
      }
      return next(req);
    }
    with(...options) {
      return new _Client(deepClone(this.clientOptions), ...options);
    }
    get location() {
      return this.clientOptions.url;
    }
  };
  function client(...options) {
    return new Client(...deepClone(options));
  }
  function getRequestParams(req, current) {
    let params = current || {};
    if (!params.url && current.url) {
      params.url = current.url;
    }
    for (let prop of [
      "method",
      "headers",
      "body",
      "mode",
      "credentials",
      "cache",
      "redirect",
      "referrer",
      "referrerPolicy",
      "integrity",
      "keepalive",
      "signal",
      "priority",
      "url"
    ]) {
      let value = req[prop];
      if (typeof value == "undefined" || value == null) {
        continue;
      }
      if (value?.[Symbol.metroProxy]) {
        value = value[Symbol.metroSource];
      }
      if (typeof value == "function") {
        params[prop] = value(params[prop], params);
      } else {
        if (prop == "url") {
          params.url = url(params.url, value);
        } else if (prop == "headers") {
          params.headers = new Headers(current.headers);
          if (!(value instanceof Headers)) {
            value = new Headers(req.headers);
          }
          for (let [key, val] of value.entries()) {
            params.headers.set(key, val);
          }
        } else {
          params[prop] = value;
        }
      }
    }
    if (req instanceof Request && req.data) {
      params.body = req.data;
    }
    return params;
  }
  function request(...options) {
    let requestParams = {
      url: typeof window != "undefined" ? url(window.location) : url("https://localhost/"),
      duplex: "half"
      // required when setting body to ReadableStream, just set it here by default already
    };
    for (let option of options) {
      if (typeof option == "string" || option instanceof URL || option instanceof URLSearchParams) {
        requestParams.url = url(requestParams.url, option);
      } else if (option && (option instanceof FormData || option instanceof ReadableStream || option instanceof Blob || option instanceof ArrayBuffer || option instanceof DataView)) {
        requestParams.body = option;
      } else if (option && typeof option == "object") {
        Object.assign(requestParams, getRequestParams(option, requestParams));
      }
    }
    let r = new Request(requestParams.url, requestParams);
    let data = requestParams.body;
    if (data) {
      if (typeof data == "object" && !(data instanceof String) && !(data instanceof ReadableStream) && !(data instanceof Blob) && !(data instanceof ArrayBuffer) && !(data instanceof DataView) && !(data instanceof FormData) && !(data instanceof URLSearchParams) && (typeof globalThis.TypedArray == "undefined" || !(data instanceof globalThis.TypedArray))) {
        if (typeof data.toString == "function") {
          requestParams.body = data.toString({ headers: r.headers });
          r = new Request(requestParams.url, requestParams);
        }
      }
    }
    Object.freeze(r);
    return new Proxy(r, {
      get(target, prop) {
        let result;
        switch (prop) {
          case Symbol.metroSource:
            result = target;
            break;
          case Symbol.metroProxy:
            result = true;
            break;
          case "with":
            result = function(...options2) {
              if (data) {
                options2.unshift({ body: data });
              }
              return request(target, ...options2);
            };
            break;
          case "data":
            result = data;
            break;
          default:
            if (target[prop] instanceof Function) {
              if (prop === "clone") {
              }
              result = target[prop].bind(target);
            } else {
              result = target[prop];
            }
            break;
        }
        return result;
      }
    });
  }
  function getResponseParams(res, current) {
    let params = current || {};
    if (!params.url && current.url) {
      params.url = current.url;
    }
    for (let prop of ["status", "statusText", "headers", "body", "url", "type", "redirected"]) {
      let value = res[prop];
      if (typeof value == "undefined" || value == null) {
        continue;
      }
      if (value?.[Symbol.metroProxy]) {
        value = value[Symbol.metroSource];
      }
      if (typeof value == "function") {
        params[prop] = value(params[prop], params);
      } else {
        if (prop == "url") {
          params.url = new URL(value, params.url || "https://localhost/");
        } else {
          params[prop] = value;
        }
      }
    }
    if (res instanceof Response && res.data) {
      params.body = res.data;
    }
    return params;
  }
  function response(...options) {
    let responseParams = {};
    for (let option of options) {
      if (typeof option == "string") {
        responseParams.body = option;
      } else if (option instanceof Response) {
        Object.assign(responseParams, getResponseParams(option, responseParams));
      } else if (option && typeof option == "object") {
        if (option instanceof FormData || option instanceof Blob || option instanceof ArrayBuffer || option instanceof DataView || option instanceof ReadableStream || option instanceof URLSearchParams || option instanceof String || typeof globalThis.TypedArray != "undefined" && option instanceof globalThis.TypedArray) {
          responseParams.body = option;
        } else {
          Object.assign(responseParams, getResponseParams(option, responseParams));
        }
      }
    }
    let data = void 0;
    if (responseParams.body) {
      data = responseParams.body;
    }
    if ([101, 204, 205, 304].includes(responseParams.status)) {
      responseParams.body = null;
    }
    let r = new Response(responseParams.body, responseParams);
    Object.freeze(r);
    return new Proxy(r, {
      get(target, prop) {
        let result;
        switch (prop) {
          case Symbol.metroProxy:
            result = true;
            break;
          case Symbol.metroSource:
            result = target;
            break;
          case "with":
            result = function(...options2) {
              return response(target, ...options2);
            };
            break;
          case "data":
            result = data;
            break;
          case "ok":
            result = target.status >= 200 && target.status < 400;
            break;
          default:
            if (typeof target[prop] == "function") {
              result = target[prop].bind(target);
            } else {
              result = target[prop];
            }
            break;
        }
        return result;
      }
    });
  }
  function appendSearchParams(url2, params) {
    if (typeof params == "function") {
      params(url2.searchParams, url2);
    } else {
      params = new URLSearchParams(params);
      params.forEach((value, key) => {
        url2.searchParams.append(key, value);
      });
    }
  }
  function url(...options) {
    let validParams = [
      "hash",
      "host",
      "hostname",
      "href",
      "password",
      "pathname",
      "port",
      "protocol",
      "username",
      "search",
      "searchParams"
    ];
    let u = new URL("https://localhost/");
    for (let option of options) {
      if (typeof option == "string" || option instanceof String) {
        u = new URL(option, u);
      } else if (option instanceof URL || typeof Location != "undefined" && option instanceof Location) {
        u = new URL(option);
      } else if (option instanceof URLSearchParams) {
        appendSearchParams(u, option);
      } else if (option && typeof option == "object") {
        for (let param in option) {
          switch (param) {
            case "search":
              if (typeof option.search == "function") {
                option.search(u.search, u);
              } else {
                u.search = new URLSearchParams(option.search);
              }
              break;
            case "searchParams":
              appendSearchParams(u, option.searchParams);
              break;
            default:
              if (!validParams.includes(param)) {
                throw metroError("metro.url: unknown url parameter " + metroURL + "url/unknown-param-name/", param);
              }
              if (typeof option[param] == "function") {
                option[param](u[param], u);
              } else if (typeof option[param] == "string" || option[param] instanceof String || typeof option[param] == "number" || option[param] instanceof Number || typeof option[param] == "boolean" || option[param] instanceof Boolean) {
                u[param] = "" + option[param];
              } else if (typeof option[param] == "object" && option[param].toString) {
                u[param] = option[param].toString();
              } else {
                throw metroError("metro.url: unsupported value for " + param + " " + metroURL + "url/unsupported-param-value/", options[param]);
              }
              break;
          }
        }
      } else {
        throw metroError("metro.url: unsupported option value " + metroURL + "url/unsupported-option-value/", option);
      }
    }
    Object.freeze(u);
    return new Proxy(u, {
      get(target, prop) {
        let result;
        switch (prop) {
          case Symbol.metroProxy:
            result = true;
            break;
          case Symbol.metroSource:
            result = target;
            break;
          case "with":
            result = function(...options2) {
              return url(target, ...options2);
            };
            break;
          case "filename":
            result = target.pathname.split("/").pop();
            break;
          case "folderpath":
            result = target.pathname.substring(0, target.pathname.lastIndexOf("\\") + 1);
            break;
          case "authority":
            result = target.username ?? "";
            result += target.password ? ":" + target.password : "";
            result += result ? "@" : "";
            result += target.hostname;
            result += target.port ? ":" + target.port : "";
            result += "/";
            result = target.protocol + "//" + result;
            break;
          case "origin":
            result = target.protocol + "//" + target.hostname;
            result += target.port ? ":" + target.port : "";
            result += "/";
            break;
          case "fragment":
            result = target.hash.substring(1);
            break;
          case "scheme":
            if (target.protocol) {
              result = target.protocol.substring(0, target.protocol.length - 1);
            } else {
              result = "";
            }
            break;
          default:
            if (target[prop] instanceof Function) {
              result = target[prop].bind(target);
            } else {
              result = target[prop];
            }
            break;
        }
        return result;
      }
    });
  }
  var metroConsole = {
    error: (message, ...details) => {
      console.error("\u24C2\uFE0F  ", message, ...details);
    },
    info: (message, ...details) => {
      console.info("\u24C2\uFE0F  ", message, ...details);
    },
    group: (name) => {
      console.group("\u24C2\uFE0F  " + name);
    },
    groupEnd: (name) => {
      console.groupEnd("\u24C2\uFE0F  " + name);
    }
  };
  function metroError(message, ...details) {
    metroConsole.error(message, ...details);
    return new Error(message, ...details);
  }
  function deepClone(object) {
    if (Array.isArray(object)) {
      return object.slice().map(deepClone);
    }
    if (object && typeof object === "object") {
      if (object.__proto__.constructor == Object || !object.__proto__) {
        let result = Object.assign({}, object);
        Object.keys(result).forEach((key) => {
          result[key] = deepClone(object[key]);
        });
        return result;
      } else {
        return object;
      }
    }
    return object;
  }

  // src/Adapters/Http.mjs
  var HttpAdapter = class {
    #client;
    #path;
    constructor(metroClient, path = "/") {
      this.#client = client(metroClient);
      this.#path = new Path(path);
    }
    get name() {
      return "HttpAdapter";
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
        throw new TypeError(path + " is not a valid path");
      }
      if (Path.isRelative(path)) {
        path = Path.collapse(path, this.#path);
      }
      return new this.constructor(this.#client, path);
    }
    //FIXME: return a jsfs result object instead of http response
    async write(path, contents, metadata = null) {
      return this.#client.put({ body: contents });
    }
    writeStream(path, writer, metadata = null) {
      throw new Error("Not yet implemented");
    }
    async read(path) {
      let response2 = await this.#client.get(path);
      let result = {
        type: this.getMimetype(response2),
        name: Path.filename(path),
        http: {
          headers: response2.headers,
          status: response2.status,
          url: response2.url
        }
      };
      if (result.type.match(/text\/.*/)) {
        result.contents = await response2.text();
      } else if (result.type.match(/application\/json.*/)) {
        result.contents = await response2.json();
      } else {
        result.contents = await response2.blob();
      }
      return result;
    }
    readStream(path, reader) {
      throw new Error("Not yet implemented");
    }
    async exists(path) {
      return this.#client.head(path);
    }
    async delete(path) {
      return this.#client.delete(path);
    }
    async list(path) {
      let supportedContentTypes = [
        "text/html",
        "text/xhtml",
        "text/xhtml+xml",
        "text/xml"
      ];
      let result = await this.read(path);
      if (supportedContentTypes.includes(result.type.split(";")[0])) {
        var html = result.contents;
      } else {
        let url2 = this.getUrl(path);
        throw new TypeError("URL " + url2 + " is not of a supported content type", {
          cause: result
        });
      }
      let basePath = url(this.#client.clientOptions.url).pathname;
      let parentUrl = this.getUrl(path);
      let dom = document.createElement("template");
      dom.innerHTML = html;
      let links = dom.content.querySelectorAll("a[href]");
      return Array.from(links).map((link) => {
        let url2 = new URL(link.getAttribute("href"), parentUrl.href);
        link.href = url2.href;
        return {
          filename: Path.filename(link.pathname),
          path: link.pathname,
          name: link.innerText,
          href: link.href
        };
      }).filter((link) => {
        let testURL = new URL(link.href);
        testURL.pathname = Path.parent(testURL.pathname);
        return testURL.href === parentUrl.href;
      }).map((link) => {
        return {
          filename: link.filename,
          path: link.path.substring(basePath.length - 1),
          //TODO: Path.collapse() now always adds a trailing '/', so this works, but the added trailing / is probably not correct
          name: link.name
        };
      });
    }
    getUrl(path) {
      let basePath = url(this.#client.clientOptions.url).pathname;
      path = Path.collapse(basePath + Path.collapse(path));
      return new URL(path, this.#client.clientOptions.url);
    }
    getMimetype(response2) {
      if (response2.headers.has("Content-Type")) {
        return response2.headers.get("Content-Type");
      } else {
        return null;
      }
    }
  };
  var supportsRequestStreams = (async () => {
    const supportsStreamsInRequestObjects = !new Request(
      "",
      {
        body: new ReadableStream(),
        method: "POST",
        duplex: "half"
        // required in chrome
      }
    ).headers.has("Content-Type");
    if (!supportsStreamsInRequestObjects) {
      return false;
    }
    return fetch(
      "data:a/a;charset=utf-8,",
      {
        method: "POST",
        body: new ReadableStream(),
        duplex: "half"
      }
    ).then(() => true, () => false);
  })();

  // src/index.mjs
  var jsfs = {
    fs: FileSystem,
    adapters: {
      https: HttpAdapter
    },
    path: Path
  };
  globalThis.jsfs = jsfs;
  var index_default = jsfs;
})();
//# sourceMappingURL=browser.js.map
