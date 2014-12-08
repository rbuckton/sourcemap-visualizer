/**
 * Defines the kinds of `Uri`
 */
(function (UriKind) {
    /**
     * The kind of the Uri is indeterminate.
     */
    UriKind[UriKind["RelativeOrAbsolute"] = 0] = "RelativeOrAbsolute";
    /**
     * The Uri is an absolute Uri.
     */
    UriKind[UriKind["Absolute"] = 1] = "Absolute";
    /**
     * The Uri is a relative Uri.
     */
    UriKind[UriKind["Relative"] = 2] = "Relative";
})(exports.UriKind || (exports.UriKind = {}));
var UriKind = exports.UriKind;
(function (UriComponents) {
    UriComponents[UriComponents["Scheme"] = 0x1] = "Scheme";
    UriComponents[UriComponents["Userinfo"] = 0x2] = "Userinfo";
    UriComponents[UriComponents["Hostname"] = 0x4] = "Hostname";
    UriComponents[UriComponents["Port"] = 0x8] = "Port";
    UriComponents[UriComponents["Directory"] = 0x10] = "Directory";
    UriComponents[UriComponents["FilenameWithoutExtension"] = 0x20] = "FilenameWithoutExtension";
    UriComponents[UriComponents["Extension"] = 0x40] = "Extension";
    UriComponents[UriComponents["Filename"] = UriComponents.FilenameWithoutExtension | UriComponents.Extension] = "Filename";
    UriComponents[UriComponents["Pathname"] = UriComponents.Directory | UriComponents.Filename] = "Pathname";
    UriComponents[UriComponents["Search"] = 0x80] = "Search";
    UriComponents[UriComponents["Hash"] = 0x100] = "Hash";
    UriComponents[UriComponents["StrongPort"] = 0x200] = "StrongPort";
    UriComponents[UriComponents["KeepDelimiter"] = 0x400] = "KeepDelimiter";
    UriComponents[UriComponents["AbsoluteUri"] = UriComponents.Scheme | UriComponents.Userinfo | UriComponents.Hostname | UriComponents.Port | UriComponents.Pathname | UriComponents.Search | UriComponents.Hash] = "AbsoluteUri";
    UriComponents[UriComponents["HostnameAndPort"] = UriComponents.Hostname | UriComponents.StrongPort] = "HostnameAndPort";
    UriComponents[UriComponents["StrongAuthority"] = UriComponents.Userinfo | UriComponents.Hostname | UriComponents.StrongPort] = "StrongAuthority";
    UriComponents[UriComponents["Origin"] = UriComponents.Scheme | UriComponents.Hostname | UriComponents.Port] = "Origin";
    UriComponents[UriComponents["PathnameAndSearch"] = UriComponents.Pathname | UriComponents.Search] = "PathnameAndSearch";
})(exports.UriComponents || (exports.UriComponents = {}));
var UriComponents = exports.UriComponents;
(function (UriFormat) {
    UriFormat[UriFormat["UriEscaped"] = 1] = "UriEscaped";
    UriFormat[UriFormat["Unescaped"] = 2] = "Unescaped";
    UriFormat[UriFormat["SafeUnescaped"] = 3] = "SafeUnescaped";
})(exports.UriFormat || (exports.UriFormat = {}));
var UriFormat = exports.UriFormat;
/**
 * Provides an object representation of a uniform resource identifier (URI) and easy access to parts of the URI.
 */
var Uri = (function () {
    function Uri() {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i - 0] = arguments[_i];
        }
        if (args.length >= 2 && args[0] instanceof Uri) {
            var baseUri = args[0];
            var relativeUri;
            if (args[1] instanceof Uri) {
                relativeUri = args[1];
            }
            else if (args[1] !== null && args[1] !== undefined) {
                relativeUri = new Uri(String(args[1]), 0 /* RelativeOrAbsolute */);
            }
            else {
                throw new TypeError("Missing required argument: uri.");
            }
            Uri.mergeCore(baseUri, relativeUri, this);
        }
        else if (args.length >= 1 && args[0] !== null && args[0] !== undefined) {
            var text = String(args[0]);
            var kind = 1 /* Absolute */;
            if (args.length >= 2) {
                if (typeof args[1] === "number") {
                    kind = args[1];
                }
                else if (typeof args[1] !== "undefined") {
                    throw new TypeError("Invalid argument: kind.");
                }
            }
            Uri.parseCore(text, kind, this);
        }
        else {
            throw new TypeError("Argument not optional.");
        }
    }
    Object.defineProperty(Uri.prototype, "isRooted", {
        /**
         * Gets a value indicating whether the pathname for the `Uri` is a root path.
         */
        get: function () {
            return this.isAbsolute || /^\//.test(this.pathname);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Uri.prototype, "isAbsolute", {
        /**
         * Gets a value indicating whether the `Uri` is an absolute URI.
         */
        get: function () {
            return !!this._scheme;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Uri.prototype, "isFile", {
        /**
         * Gets a value indicating whether the `Uri` is a file URI.
         */
        get: function () {
            return this._scheme === Uri.UriSchemeFile;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Uri.prototype, "isUnc", {
        /**
         * Gets a value indicating whether the `Uri` is a UNC path.
         */
        get: function () {
            return this.isFile && !!this._hostname;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Uri.prototype, "isDosPath", {
        /**
         * Gets a value indicating whether the `Uri` is a DOS path.
         */
        get: function () {
            return this.isFile && !this._hostname && /^\/?[a-z][:|]/i.test(this._pathname);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Uri.prototype, "hasDefaultPort", {
        /**
         * Gets a value indicating whether the `Uri` is using the default port for the current scheme.
         */
        get: function () {
            if (this.isAbsolute) {
                if (typeof this._port !== "number") {
                    return true;
                }
                if (this._scheme === Uri.UriSchemeHttp && this._port === 80) {
                    return true;
                }
                if (this._scheme === Uri.UriSchemeHttps && this._port === 443) {
                    return true;
                }
            }
            return false;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Uri.prototype, "raw", {
        /**
         * Gets the raw string provided for the `Uri`.
         */
        get: function () {
            return this._raw;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Uri.prototype, "origin", {
        /**
         * Gets the origin from the `Uri`.
         */
        get: function () {
            return this.getComponentsCore(UriComponents.Origin, 1 /* UriEscaped */);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Uri.prototype, "authority", {
        /**
         * Gets the authority component of the `Uri`.
         */
        get: function () {
            return this.getComponentsCore(UriComponents.HostnameAndPort, 1 /* UriEscaped */);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Uri.prototype, "protocol", {
        /**
         * Gets the protocol (e.g. "http:", "https:") from the `Uri`.
         */
        get: function () {
            return this.getComponentsCore(1 /* Scheme */ | 1024 /* KeepDelimiter */, 1 /* UriEscaped */);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Uri.prototype, "scheme", {
        /**
         * Gets the scheme (e.g. "http", "https") from the `Uri`.
         */
        get: function () {
            return this.getComponentsCore(1 /* Scheme */, 1 /* UriEscaped */);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Uri.prototype, "userinfo", {
        /**
         * Gets the userinfo component of the `Uri`.
         */
        get: function () {
            return this.getComponentsCore(2 /* Userinfo */, 1 /* UriEscaped */);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Uri.prototype, "host", {
        /**
         * Gets the hostname and optional port of the `Uri`.
         */
        get: function () {
            return this.getComponentsCore(UriComponents.HostnameAndPort, 1 /* UriEscaped */);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Uri.prototype, "hostname", {
        /**
         * Gets the hostname of the `Uri`.
         */
        get: function () {
            return this.getComponentsCore(4 /* Hostname */, 1 /* UriEscaped */);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Uri.prototype, "pathname", {
        /**
         * Gets the pathname component of the `Uri`.
         */
        get: function () {
            return this.getComponentsCore(UriComponents.Pathname, 1 /* UriEscaped */);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Uri.prototype, "pathnameAndSearch", {
        /**
         * Gets the pathname and search components of the `Uri`.
         */
        get: function () {
            return this.getComponentsCore(UriComponents.PathnameAndSearch, 1 /* UriEscaped */);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Uri.prototype, "search", {
        /**
         * Gets the search component of the `Uri`.
         */
        get: function () {
            return this.getComponentsCore(128 /* Search */ | 1024 /* KeepDelimiter */, 1 /* UriEscaped */);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Uri.prototype, "hash", {
        /**
         * Gets the fragment component of the `Uri`.
         */
        get: function () {
            return this.getComponentsCore(256 /* Hash */ | 1024 /* KeepDelimiter */, 1 /* UriEscaped */);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Uri.prototype, "port", {
        /**
         * Gets the port component of the `Uri`.
         */
        get: function () {
            if (typeof this._port === "number") {
                return this._port;
            }
            if (this._scheme === Uri.UriSchemeHttp) {
                return Uri.DEFAULT_PORT_HTTP;
            }
            if (this._scheme === Uri.UriSchemeHttps) {
                return Uri.DEFAULT_PORT_HTTPS;
            }
            return undefined;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Uri.prototype, "absoluteUri", {
        /**
         * Gets the absolute URI.
         */
        get: function () {
            return this.getComponentsCore(UriComponents.AbsoluteUri, 1 /* UriEscaped */);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Uri.prototype, "absolutePath", {
        /**
         * Gets the absolute path of the `Uri`.
         */
        get: function () {
            var pathname = this.getComponentsCore(UriComponents.Pathname | 1024 /* KeepDelimiter */, 1 /* UriEscaped */);
            if (this.isDosPath) {
                pathname = pathname.substr(1);
            }
            return pathname;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Uri.prototype, "localPath", {
        /**
         * Gets the local DOS or UNC path for a file URI.
         */
        get: function () {
            if (this.isUnc || this.isDosPath) {
                var pathname = this.getComponentsCore(UriComponents.Pathname | 1024 /* KeepDelimiter */, 1 /* UriEscaped */);
                pathname = pathname.replace(Uri.PATH_DELIMITER, Uri.DOS_PATH_DELIMITER);
                if (this.isUnc) {
                    return Uri.UNC_ROOT + this.hostname + pathname;
                }
                else if (this.isDosPath) {
                    return pathname.substr(1);
                }
            }
            return "";
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Uri.prototype, "segments", {
        /**
         * Gets the path segments that make up the absolute path of the URI
         */
        get: function () {
            var pathname = this.getComponentsCore(UriComponents.Pathname | 1024 /* KeepDelimiter */, 1 /* UriEscaped */);
            if (pathname.length > 1) {
                pathname = pathname.substr(1);
                return pathname.split(Uri.PATH_DELIMITER);
            }
            return [];
        },
        enumerable: true,
        configurable: true
    });
    /**
     * Creates a new instance of the `Uri` class with the specified URI.
     * @param text A URI.
     * @returns A new `Uri`.
     */
    Uri.parse = function (text, kind) {
        if (kind === void 0) { kind = 1 /* Absolute */; }
        return new Uri(text, kind);
    };
    Uri.tryParse = function (text, kind) {
        if (kind === void 0) { kind = 1 /* Absolute */; }
        if (text === null || text === undefined) {
            throw new TypeError("Missing required argument: text.");
        }
        return Uri.parseCore(text, kind, undefined);
    };
    /**
     * Creates a new instance of the `Uri` class from a specified base `Uri` instance and a relative `Uri` instance.
     * @param baseUri A base `Uri` instance.
     * @param uri A relative `Uri` instance.
     * @returns A new `Uri` if it could be successfully parsed; otherwise, `undefined`.
     */
    Uri.tryMerge = function (baseUri, uri) {
        if (baseUri === null || baseUri === undefined) {
            throw new TypeError("Missing required argument: baseUri.");
        }
        if (uri === null || uri === undefined) {
            throw new TypeError("Missing required argument: uri.");
        }
        return Uri.mergeCore(baseUri, uri, undefined);
    };
    /**
     * Creates a new `Uri` instance with the provided components.
     * @param components An object containing named components for the new `Uri`.
     * @returns A new `Uri` instance.
     */
    Uri.create = function (data) {
        if (!data) {
            data = {};
        }
        var scheme;
        var userinfo;
        var hostname;
        var portString;
        var port;
        var pathname;
        var hasColonInFirstPathSegment;
        var search;
        var hash;
        var keepDelimiter = false;
        var components = 0;
        if (typeof data.keepDelimiter === "boolean") {
            keepDelimiter = data.keepDelimiter;
        }
        if (typeof data.scheme === "string") {
            scheme = decodeURIComponent(data.scheme.toLowerCase());
            components |= 1 /* Scheme */;
            if (scheme === Uri.UriSchemeHttp || scheme === Uri.UriSchemeHttps) {
                components |= 512 /* StrongPort */;
            }
        }
        if (typeof data.userinfo === "string") {
            userinfo = data.userinfo.toLowerCase();
            components |= 2 /* Userinfo */;
        }
        if (typeof data.hostname === "string") {
            hostname = data.hostname.toLowerCase();
            components |= 4 /* Hostname */;
        }
        if (typeof data.port === "number") {
            if (data instanceof Uri) {
                var componentsUri = data;
                port = componentsUri._port;
            }
            else {
                if (data.port < 0) {
                    throw new RangeError("Invalid port.");
                }
                port = data.port;
            }
            if (typeof port === "number") {
                components |= 8 /* Port */ | 512 /* StrongPort */;
            }
        }
        if (data.pathname) {
            pathname = data.pathname;
            components |= UriComponents.Pathname;
        }
        if (data.search) {
            search = data.search;
            if (!keepDelimiter && (search.length > 0 && search.charAt(0) === Uri.SEARCH_DELIMITER)) {
                search = search.substr(1);
            }
            components |= 128 /* Search */;
        }
        if (data.hash) {
            hash = data.hash;
            if (!keepDelimiter && (hash.length > 0 && hash.charAt(0) === Uri.HASH_DELIMITER)) {
                hash = hash.substr(1);
            }
            components |= 256 /* Hash */;
        }
        var uri = Object.create(Uri.prototype);
        uri._scheme = scheme;
        uri._userinfo = userinfo;
        uri._hostname = hostname;
        uri._port = port;
        uri._pathname = pathname;
        uri._search = search;
        uri._hash = hash;
        uri._components = components;
        uri = new Uri(uri.toString());
        if (typeof data.uri === "string") {
            var baseUri = new Uri(data.uri);
            uri = new Uri(baseUri, uri);
        }
        return uri;
    };
    Uri.equals = function (xAny, yAny, ignoreCase) {
        if (ignoreCase === void 0) { ignoreCase = false; }
        if (xAny === yAny) {
            return true;
        }
        else if (xAny === null) {
            return yAny === null;
        }
        else if (yAny === null) {
            return false;
        }
        else if (xAny === undefined) {
            return yAny === undefined;
        }
        else if (yAny === undefined) {
            return false;
        }
        else {
            var x;
            var y;
            if (typeof xAny === "string") {
                x = new Uri(xAny, 0 /* RelativeOrAbsolute */);
            }
            else {
                x = xAny;
            }
            if (typeof yAny === "string") {
                y = new Uri(yAny, 0 /* RelativeOrAbsolute */);
            }
            else {
                y = yAny;
            }
            if (Uri.stringEquals(x._raw, y._raw, ignoreCase)) {
                return true;
            }
            else if (x._scheme === y._scheme && x._userinfo === y._userinfo && x._hostname === y._hostname && x.port === y.port && Uri.stringEquals(x._pathname, y._pathname, ignoreCase) && Uri.stringEquals(x._search, y._search, ignoreCase) && Uri.stringEquals(x._hash, y._hash, ignoreCase)) {
                return true;
            }
            else {
                return false;
            }
        }
    };
    /**
     * Compares two `Uri` instances.
     * @param x A `Uri` instance.
     * @param y A `Uri` instance.
     * @param ignoreCase A value indicating whether the comparison is case insensitive (default `false`).
     * @returns A positive value if `x` is greater than `y`, a negative value if `x` is less than `y`, or zero if they are equivalent.
     */
    Uri.compare = function (x, y, partsToCompare, compareFormat, ignoreCase) {
        if (partsToCompare === void 0) { partsToCompare = UriComponents.AbsoluteUri; }
        if (compareFormat === void 0) { compareFormat = 1 /* UriEscaped */; }
        if (ignoreCase === void 0) { ignoreCase = false; }
        if (typeof partsToCompare !== "number") {
            throw new TypeError("Invalid argument: partsToCompare.");
        }
        if (typeof compareFormat !== "number") {
            throw new TypeError("Invalid argument: compareFormat.");
        }
        if ((compareFormat & ~3 /* SafeUnescaped */) !== 0) {
            throw new RangeError("Argument out of range: compareFormat.");
        }
        if (x === y) {
            return 0;
        }
        else if (x === null || x === undefined) {
            if (y === null || y === undefined) {
                return 0;
            }
            return -1;
        }
        else if (y === null || y === undefined) {
            return +1;
        }
        else if (!x.isAbsolute || !y.isAbsolute) {
            if (x.isAbsolute) {
                return +1;
            }
            else if (y.isAbsolute) {
                return -1;
            }
            else {
                return Uri.compareStrings(x.raw, y.raw, ignoreCase);
            }
        }
        else {
            return Uri.compareStrings(x.getComponentsCore(partsToCompare, compareFormat), y.getComponentsCore(partsToCompare, compareFormat), ignoreCase);
        }
    };
    /**
     * Gets the current Uri for the host environment.
     */
    Uri.getCurrent = function () {
        if (typeof self !== "undefined") {
            return new Uri(self.location.href);
        }
        else {
            return new Uri(".");
        }
    };
    /**
     * Gets a canonical string representation of the `Uri`.
     * @param components The components to include.
     * @param format The output format of the result.
     */
    Uri.prototype.getComponents = function (components, format) {
        if (typeof components !== "number" || typeof format !== "number") {
            throw new TypeError("Invalid argument: components.");
        }
        if (typeof format !== "number") {
            throw new TypeError("Invalid argument: format.");
        }
        if ((format & ~3 /* SafeUnescaped */) !== 0) {
            throw new RangeError("Argument out of range: format.");
        }
        components = Uri.adjustComponents(components);
        return this.getComponentsCore(components, format);
    };
    /**
     * Gets a canonical string representation of the `Uri`.
     */
    Uri.prototype.toString = function () {
        return this.getComponentsCore(UriComponents.AbsoluteUri, 3 /* SafeUnescaped */);
    };
    /**
     * Gets a canonical representation of the `Uri` when serializing to JSON.
     */
    Uri.prototype.toJSON = function () {
        return this.toString();
    };
    Uri.prototype.isSameOrigin = function (uriAny) {
        if (uriAny === null || uriAny === undefined) {
            throw new TypeError("Missing required argument: uri.");
        }
        var uri = uriAny instanceof Uri ? uriAny : new Uri(String(uriAny));
        if (this.isAbsolute) {
            return this.getComponentsCore(UriComponents.Origin, 1 /* UriEscaped */) === uri.getComponentsCore(UriComponents.Origin, 1 /* UriEscaped */);
        }
        return !uri.isAbsolute;
    };
    /**
     * Determines whether the current `Uri` instance is a base of the specified `Uri` instance.
     * @param uri A `Uri` instance.
     */
    Uri.prototype.isBaseOf = function (uri) {
        if (uri === null || uri === undefined) {
            throw new TypeError("Missing required argument: uri.");
        }
        var thisComponents = this.getComponentsCore(UriComponents.AbsoluteUri & ~256 /* Hash */, 3 /* SafeUnescaped */);
        var otherComponents = this.getComponentsCore(UriComponents.AbsoluteUri & ~256 /* Hash */, 3 /* SafeUnescaped */);
        var thisSegments = thisComponents.split(Uri.PATH_DELIMITER);
        var otherSegments = otherComponents.split(Uri.PATH_DELIMITER);
        if (thisSegments.length > otherSegments.length) {
            return false;
        }
        for (var i = 0; i < thisSegments.length; i++) {
            if (!Uri.compareStrings(thisSegments[i], otherSegments[i], this.isDosPath || this.isUnc || uri.isDosPath || uri.isUnc)) {
                return false;
            }
        }
        return true;
    };
    /**
     * Creates a new `Uri` instance that is the relative path from this `Uri` instance to the provided `Uri` instance.
     * @param uri The destination `Uri` instance.
     */
    Uri.prototype.makeRelative = function (uri) {
        if (uri === null || uri === undefined) {
            throw new TypeError("Missing required argument: uri.");
        }
        if (!this.isAbsolute || !uri.isAbsolute) {
            throw new URIError("URI not absolute.");
        }
        if (!this.isSameOrigin(uri)) {
            return uri;
        }
        var otherAbsolutePath = uri.absolutePath;
        var relativePath = Uri.computePathDifference(this.absolutePath, otherAbsolutePath, this.isDosPath || this.isUnc);
        var m = /[:\\/?#]/.exec(relativePath);
        if (m && m[0] === ":" && (!uri.isDosPath || relativePath !== otherAbsolutePath)) {
            relativePath = "./" + relativePath;
        }
        var relativeUriString = relativePath + uri.getComponentsCore(128 /* Search */ | 256 /* Hash */, 1 /* UriEscaped */);
        return new Uri(relativeUriString, 2 /* Relative */);
    };
    Uri.prototype.equals = function (uriAny, ignoreCase) {
        return Uri.equals(this, uriAny, ignoreCase);
    };
    /** Compares whether two strings are equivalent */
    Uri.stringEquals = function (x, y, ignoreCase) {
        if (ignoreCase && typeof x === "string" && typeof y === "string") {
            x = x.toLowerCase();
            y = y.toLowerCase();
        }
        return x === y;
    };
    /** Compares two strings */
    Uri.compareStrings = function (x, y, ignoreCase) {
        if (ignoreCase && typeof x === "string" && typeof y === "string") {
            x = x.toLowerCase();
            y = y.toLowerCase();
        }
        if (x > y) {
            return +1;
        }
        else if (x < y) {
            return -1;
        }
        else {
            return 0;
        }
    };
    /** Compares two numbers */
    Uri.compareNumbers = function (x, y) {
        if (x < y) {
            return -1;
        }
        else if (x > y) {
            return +1;
        }
        else {
            return 0;
        }
    };
    /** Formats the userinfo component */
    Uri.formatUserinfo = function (userinfo, format) {
        switch (format) {
            case 1 /* UriEscaped */:
                // When we escape the userinfo segment, we force any unencoded '?' or '#' to be encoded. 
                // The '%' character will remain unescaped.
                userinfo = Uri.escape(userinfo, "?#", "%");
                break;
            case 2 /* Unescaped */:
                // we want a completely unescaped string
                userinfo = decodeURIComponent(userinfo);
                break;
            case 3 /* SafeUnescaped */:
                userinfo = Uri.unescape(userinfo, "@/\\", "safe");
                break;
        }
        return userinfo;
    };
    /** Formats the path component */
    Uri.formatPath = function (pathname, format) {
        switch (format) {
            case 1 /* UriEscaped */:
                pathname = Uri.escape(pathname, "?#", "%");
                break;
            case 2 /* Unescaped */:
                pathname = decodeURIComponent(pathname);
                break;
            case 3 /* SafeUnescaped */:
                pathname = Uri.unescape(pathname, "?#", "safe");
                break;
        }
        return pathname;
    };
    /** Formats the search component */
    Uri.formatSearch = function (search, format) {
        switch (format) {
            case 1 /* UriEscaped */:
                search = Uri.escape(search, "#", "%");
                break;
            case 2 /* Unescaped */:
                search = Uri.unescape(search, "#", "all");
                break;
            case 3 /* SafeUnescaped */:
                search = Uri.unescape(search, "#", "safe");
                break;
        }
        return search;
    };
    /** Formats the hash component. */
    Uri.formatHash = function (hash, format) {
        switch (format) {
            case 1 /* UriEscaped */:
                hash = Uri.escape(hash, "", "%");
                break;
            case 2 /* Unescaped */:
                hash = Uri.unescape(hash, "#", "all");
                break;
            case 3 /* SafeUnescaped */:
                hash = Uri.unescape(hash, "#", "safe");
                break;
        }
        return hash;
    };
    /** Escapes a URI component */
    Uri.escape = function (text, forced, reserved) {
        if (!text) {
            return text;
        }
        var parts = [];
        var start = 0;
        var mode = "";
        for (var i = 0; i < text.length; i++) {
            var ch = text.charAt(i);
            if (forced.indexOf(ch) > -1) {
                mode = "forced";
            }
            else if (reserved.indexOf(ch) > -1) {
                mode = "reserved";
            }
            if (mode !== "") {
                if (start < i) {
                    parts.push(encodeURI(text.substring(start, i)));
                }
                start = i + 1;
                if (mode === "forced") {
                    parts.push(encodeURIComponent(ch));
                }
                else if (mode === "reserved") {
                    parts.push(ch);
                }
                mode = "";
            }
        }
        if (start < i) {
            parts.push(encodeURI(text.substring(start, i)));
        }
        return parts.join("");
    };
    /** Unescapes an escaped URI component */
    Uri.unescape = function (text, reserved, mode) {
        if (!text) {
            return text;
        }
        var parts = [];
        var start = 0;
        var escapeReserved = false;
        var writeCurrent = false;
        var i;
        var pushEscaped = function (ch) {
            parts.push(encodeURIComponent(ch));
        };
        var pushUnescaped = function (ch, size) {
            parts.push(ch);
            i += size;
            start = i + 1;
        };
        var pushChunk = function () {
            if (start < i) {
                parts.push(text.substring(start, i));
            }
            start = i + 1;
        };
        for (i = 0; i < text.length; i++) {
            var ch = text.charAt(i);
            var size = 1;
            if (ch === "%") {
                if (i + 3 <= text.length) {
                    var segment = text.substr(i, 3);
                    ch = "";
                    if (/^%[a-f\d]{2}$/i.test(segment)) {
                        var unit = parseInt("0x" + segment.substr(1));
                        if (unit < 0x80) {
                            ch = decodeURIComponent(segment);
                            size = 2;
                        }
                        else if (unit < 0xe0 && i + 6 <= text.length) {
                            segment = text.substr(i, 6);
                            if (/^(%[a-f\d]{2}){2}$/i.test(segment)) {
                                ch = decodeURIComponent(segment);
                                size = 5;
                            }
                        }
                        else if (unit < 0xf0 && i + 9 <= text.length) {
                            segment = text.substr(i, 9);
                            if (/^(%[a-f\d]{2}){3}$/i.test(segment)) {
                                ch = decodeURIComponent(segment);
                                size = 8;
                            }
                        }
                        else if (unit < 0xf5 && i + 12 <= text.length) {
                            segment = text.substr(i, 12);
                            if (/^(%[a-f\d]{2}){4}$/i.test(segment)) {
                                ch = decodeURIComponent(segment);
                                size = 11;
                            }
                        }
                    }
                    if (mode === "all") {
                        if (ch.length !== 1) {
                            continue;
                        }
                        pushChunk();
                        pushUnescaped(ch, size);
                    }
                    else if (ch.length !== 1) {
                        continue;
                    }
                    else if (ch === "%" || reserved.indexOf(ch) > -1) {
                        // do not unescape % or any reserved characters
                        i += 2;
                    }
                    else if (/^[;/?:@&=+$#%\\\x00-\x17]$/.test(ch)) {
                        // do not unescape dangerous characters in safe mode
                        i += 2;
                    }
                    else {
                        pushChunk();
                        pushUnescaped(ch, size);
                    }
                }
            }
            else if (mode === "all") {
                continue;
            }
            else if (reserved.indexOf(ch) > -1) {
                pushChunk();
                pushEscaped(ch);
            }
        }
        pushChunk();
        return parts.join("");
    };
    /** Parses a URI. */
    Uri.parseCore = function (text, kind, instance, intern) {
        var scheme;
        var userinfo;
        var hostname;
        var portString;
        var port;
        var pathname;
        var hasColonInFirstPathSegment;
        var search;
        var hash;
        var components = 0;
        var raw = text;
        text = text.trim();
        pathname = text;
        if (kind !== 2 /* Relative */) {
            if (Uri.DosPath.test(text)) {
                text = "file:///" + text;
            }
            var m = Uri.UriParser.exec(text);
            if (!m) {
                if (kind === 1 /* Absolute */) {
                    if (instance) {
                        throw new URIError();
                    }
                    return;
                }
                kind = 2 /* Relative */;
            }
            else {
                scheme = m[Uri.SCHEME_INDEX];
                userinfo = m[Uri.USERINFO_INDEX];
                hostname = m[Uri.HOSTNAME_INDEX];
                portString = m[Uri.PORT_INDEX];
                pathname = m[Uri.PATHNAME_INDEX];
                hasColonInFirstPathSegment = !!m[Uri.SCHEMESEGMENT_INDEX];
                search = m[Uri.SEARCH_INDEX];
                hash = m[Uri.HASH_INDEX];
                kind = 1 /* Absolute */;
            }
            // the second part of the following `if` statement is designed to verify the `path-noscheme` production
            // of RFC3986. The UriParser regular expression can directly handle all of the productions of `relative-part` except
            // for `path-noscheme`. Instead, we must explicitly fail when a URI without a scheme starts with a non-absolute path segment
            // that contains a colon (":") character.
            if (!scheme && hasColonInFirstPathSegment) {
                if (instance) {
                    throw new URIError();
                }
                return;
            }
            if ((scheme || hostname) && pathname) {
                pathname = pathname.replace(/\\/g, Uri.PATH_DELIMITER);
            }
            // the following supports backwards compatibility with F12's odd handling of file:// protocols, where it allows "file://..\path" and
            // "file://.\path", and treats those and "file:///..\path" as relative URLs.
            if (scheme && scheme.toLowerCase() === Uri.UriSchemeFile) {
                if ((/^\.{1,2}$/.test(hostname) && /^([\\/]|$)/.test(pathname)) || (/^[a-z]$/i.test(hostname) && /^:[\\/]/.test(pathname))) {
                    // fixes: file://./path to file:///./path
                    // fixes: file://../path to file:///../path
                    // fixes: file://c:/path to file:///c:/path
                    pathname = hostname + pathname;
                    hostname = undefined;
                }
                else if (!hostname) {
                    if (/^[\\/]\.{1,2}/.test(pathname)) {
                        pathname = pathname.substr(1);
                    }
                    else if (/^[\\/]{2,}/.test(pathname)) {
                        pathname = pathname.replace(/^[\\/]{2,}/, "");
                        var hostSeparatorIndex = pathname.indexOf(Uri.PATH_DELIMITER);
                        if (hostSeparatorIndex > -1) {
                            hostname = pathname.substr(0, hostSeparatorIndex);
                            pathname = pathname.substr(hostSeparatorIndex);
                        }
                        else {
                            hostname = pathname;
                            pathname = "";
                        }
                    }
                }
            }
        }
        if (typeof scheme === "string") {
            scheme = scheme.toLowerCase();
            components |= 1 /* Scheme */;
            if (scheme === Uri.UriSchemeHttp || scheme === Uri.UriSchemeHttps) {
                components |= 512 /* StrongPort */;
            }
        }
        if (typeof userinfo === "string") {
            components |= 2 /* Userinfo */;
        }
        if (typeof hostname === "string") {
            hostname = hostname.toLowerCase();
            components |= 4 /* Hostname */;
        }
        if (typeof portString === "string") {
            port = parseInt(portString);
            components |= 8 /* Port */ | 512 /* StrongPort */;
        }
        if (typeof pathname === "string" && kind !== 2 /* Relative */) {
            pathname = Uri.normalizePath(pathname);
        }
        if (pathname) {
            components |= UriComponents.Pathname;
        }
        if (typeof search === "string") {
            components |= 128 /* Search */;
        }
        if (typeof hash === "string") {
            components |= 256 /* Hash */;
        }
        if (!instance) {
            instance = Object.create(Uri.prototype);
        }
        instance._scheme = scheme;
        instance._userinfo = userinfo;
        instance._hostname = hostname;
        instance._port = port;
        instance._pathname = pathname;
        instance._search = search;
        instance._hash = hash;
        instance._raw = raw;
        instance._components = components;
        return instance;
    };
    /** Merges two `Uri` instances. */
    Uri.mergeCore = function (baseUri, uri, instance, intern) {
        if (!instance && uri.isAbsolute) {
            return uri;
        }
        var scheme;
        var userinfo;
        var hostname;
        var port;
        var pathname;
        var search;
        var hash;
        var components = 0;
        if (uri._scheme) {
            scheme = uri._scheme;
            userinfo = uri._userinfo;
            hostname = uri._hostname;
            port = uri._port;
            pathname = Uri.normalizePath(uri._pathname);
            search = uri._search;
        }
        else {
            if (uri._hostname) {
                userinfo = uri._userinfo;
                hostname = uri._hostname;
                port = uri._port;
                pathname = Uri.normalizePath(uri._pathname);
                search = uri._search;
            }
            else {
                if (!uri._pathname) {
                    pathname = baseUri._pathname;
                    if (uri._search) {
                        search = uri._search;
                    }
                    else {
                        search = baseUri._search;
                    }
                }
                else {
                    if (uri._pathname.charAt(0) === Uri.PATH_DELIMITER) {
                        pathname = Uri.normalizePath(uri._pathname);
                    }
                    else {
                        pathname = Uri.mergePath(baseUri._pathname, uri._pathname);
                        pathname = Uri.normalizePath(pathname);
                    }
                    search = uri._search;
                }
                userinfo = baseUri._userinfo;
                hostname = baseUri._hostname;
                port = baseUri._port;
            }
            scheme = baseUri._scheme;
        }
        hash = uri._hash;
        if (typeof scheme === "string") {
            components |= 1 /* Scheme */;
            if (scheme === Uri.UriSchemeHttp || scheme === Uri.UriSchemeHttps) {
                components |= 512 /* StrongPort */;
            }
        }
        if (typeof userinfo === "string") {
            components |= 2 /* Userinfo */;
        }
        if (typeof hostname === "string") {
            components |= 4 /* Hostname */;
        }
        if (typeof port === "number") {
            components |= 8 /* Port */ | 512 /* StrongPort */;
        }
        if (pathname) {
            components |= UriComponents.Pathname;
        }
        if (typeof search === "string") {
            components |= 128 /* Search */;
        }
        if (typeof hash === "string") {
            components |= 256 /* Hash */;
        }
        if (!instance) {
            instance = Object.create(Uri.prototype);
        }
        instance._scheme = scheme;
        instance._userinfo = userinfo;
        instance._hostname = hostname;
        instance._port = port;
        instance._pathname = pathname;
        instance._search = search;
        instance._hash = hash;
        instance._components = components;
        instance._raw = instance.toString();
        return instance;
    };
    /** Merges two paths. */
    Uri.mergePath = function (basepath, relativepath) {
        var lastPathDelimiterIndex = -1;
        if (basepath) {
            lastPathDelimiterIndex = basepath.lastIndexOf(Uri.PATH_DELIMITER);
        }
        if (lastPathDelimiterIndex >= 0) {
            return basepath.substr(0, lastPathDelimiterIndex + 1) + relativepath;
        }
        else {
            return relativepath;
        }
    };
    /** Normalizes a path. */
    Uri.normalizePath = function (pathname) {
        // remove leading/trailing whitespace
        pathname = pathname.replace(/^\s+|\s+$/g, "");
        // normalize path seperators
        pathname = pathname.replace(/\\+|\/+/g, Uri.PATH_DELIMITER);
        // split into segments 
        var parts = pathname.split(/\//g);
        var rooted = parts[0] === "";
        if (rooted) {
            parts.shift();
        }
        for (var i = 0; i < parts.length;) {
            var part = parts[i];
            switch (part) {
                case Uri.CURRENT_DIRECTORY_TOKEN:
                    {
                        if (i !== 0 || rooted) {
                            parts.splice(i, 1);
                            if (i === parts.length) {
                                parts.push("");
                            }
                            continue;
                        }
                        break;
                    }
                case Uri.PARENT_DIRECTORY_TOKEN:
                    {
                        if (i === 0 && rooted) {
                            parts.splice(i, 1);
                            continue;
                        }
                        if (i >= 1 && parts[i - 1] !== Uri.CURRENT_DIRECTORY_TOKEN && parts[i - 1] !== Uri.PARENT_DIRECTORY_TOKEN) {
                            parts.splice(--i, 2);
                            if (i === parts.length) {
                                parts.push("");
                            }
                            continue;
                        }
                        break;
                    }
            }
            i++;
        }
        if (rooted) {
            parts.unshift("");
        }
        // combine path segments.
        pathname = parts.join(Uri.PATH_DELIMITER);
        return pathname;
    };
    /** Computes the difference between two paths. */
    Uri.computePathDifference = function (x, y, ignoreCase) {
        var i;
        var lastPathIndex = -1;
        for (i = 0; i < x.length && i < y.length && Uri.compareStrings(x.charAt(i), y.charAt(i), ignoreCase) === 0; i++) {
            if (x.charAt(i) === Uri.PATH_DELIMITER) {
                lastPathIndex = i;
            }
        }
        if (i === 0) {
            return y;
        }
        else if (i === x.length && i === y.length) {
            return "";
        }
        var parts = [];
        for (; i < x.length; i++) {
            if (x.charAt(i) === Uri.PATH_DELIMITER) {
                parts.push(Uri.PARENT_DIRECTORY_TOKEN, Uri.PATH_DELIMITER);
            }
        }
        if (parts.length === 0 && y.length - 1 === lastPathIndex) {
            return Uri.CURRENT_DIRECTORY_TOKEN + Uri.PATH_DELIMITER;
        }
        return parts.join("") + y.substr(lastPathIndex + 1);
    };
    /** Adjusts the requested components to make them a valid fragment */
    Uri.adjustComponents = function (components) {
        if (components & 512 /* StrongPort */) {
            components |= 8 /* Port */;
        }
        // Userinfo included with anything other than KeepDelimiter requires a hostname
        if (components & 2 /* Userinfo */ && (components & ~1024 /* KeepDelimiter */) !== 2 /* Userinfo */) {
            components |= 4 /* Hostname */;
        }
        // Port included with anything other than KeepDeleimiter or StrongPort requires a hostname
        if (components & 8 /* Port */ && (components & ~(1024 /* KeepDelimiter */ | 512 /* StrongPort */)) !== 8 /* Port */) {
            components |= 4 /* Hostname */;
        }
        // Hash along with any part of Origin requires the full path and Search.
        // Search along with any part of Origin requires a full path.
        // Extension along with any part of Origin requires the directory and file.
        // File along with any part of Origin requires the directory.
        if (components & UriComponents.Origin) {
            if (components & 256 /* Hash */) {
                components |= UriComponents.PathnameAndSearch;
            }
            else if (components & 128 /* Search */) {
                components |= UriComponents.Pathname;
            }
            else if (components & 64 /* Extension */) {
                components |= 16 /* Directory */ | 32 /* FilenameWithoutExtension */;
            }
            else if (components & 32 /* FilenameWithoutExtension */) {
                components |= 16 /* Directory */;
            }
        }
        // Directory along with Extension requires the Filename
        if ((components & UriComponents.Pathname) === (16 /* Directory */ | 64 /* Extension */)) {
            components |= 32 /* FilenameWithoutExtension */;
        }
        return components;
    };
    /** Gets the rebuilt URI string for the specified URI components and format. */
    Uri.prototype.getComponentsCore = function (components, format) {
        var parts = [];
        // Scheme
        var isFileScheme = false;
        var finalComponents = components & this._components;
        if (finalComponents & 1 /* Scheme */) {
            parts.push(this._scheme);
            isFileScheme = this._scheme === Uri.UriSchemeFile;
            if (components !== 1 /* Scheme */) {
                parts.push(Uri.PROTOCOL_DELIMITER);
            }
        }
        if ((components & (1 /* Scheme */ | 1024 /* KeepDelimiter */)) && (finalComponents & (UriComponents.StrongAuthority | 8 /* Port */)) || isFileScheme) {
            parts.push(Uri.SCHEME_DELIMITER);
        }
        if (finalComponents & (UriComponents.StrongAuthority | 8 /* Port */)) {
            // Userinfo
            if (finalComponents & 2 /* Userinfo */) {
                parts.push(Uri.formatUserinfo(this._userinfo, format));
                if (components !== 2 /* Userinfo */) {
                    parts.push(Uri.USERINFO_DELIMITER);
                }
            }
            // Hostname
            if (finalComponents & 4 /* Hostname */) {
                parts.push(this._hostname);
            }
            // Port
            if (finalComponents & (8 /* Port */ | 512 /* StrongPort */)) {
                parts.push(Uri.PORT_DELIMITER);
                parts.push(this.port.toString());
            }
        }
        // Path
        if (components & UriComponents.Pathname) {
            parts.push(this.getCanonicalPath(components, format));
        }
        // Search
        if (finalComponents & 128 /* Search */) {
            if (components !== 128 /* Search */) {
                parts.push(Uri.SEARCH_DELIMITER);
            }
            parts.push(Uri.formatSearch(this._search, format));
        }
        // Hash
        if (finalComponents & 256 /* Hash */) {
            if (components !== 256 /* Hash */) {
                parts.push(Uri.HASH_DELIMITER);
            }
            parts.push(Uri.formatHash(this._hash, format));
        }
        var result = parts.join("");
        return result;
    };
    /** Gets the path segments for the specified URI components and format. */
    Uri.prototype.getCanonicalPath = function (components, format) {
        var pathname = this._pathname;
        var needsDelimiter = false;
        if ((components & 1024 /* KeepDelimiter */)) {
            needsDelimiter = true;
        }
        else if (this.isAbsolute) {
            if (this.isFile) {
                needsDelimiter = true;
            }
            else if ((this._components & (4 /* Hostname */ | UriComponents.Pathname)) === (4 /* Hostname */ | UriComponents.Pathname)) {
                needsDelimiter = true;
            }
        }
        if (!(this._components & UriComponents.Pathname) || pathname.length === 0) {
            if ((components & 16 /* Directory */) && needsDelimiter) {
                return Uri.PATH_DELIMITER;
            }
            return "";
        }
        if (components & 16 /* Directory */) {
            var isFirstSlashAbsent = pathname.charAt(0) !== Uri.PATH_DELIMITER;
            if (needsDelimiter && isFirstSlashAbsent) {
                pathname = Uri.PATH_DELIMITER + pathname;
            }
        }
        var pathComponents = components & UriComponents.Pathname;
        if (pathComponents === UriComponents.Pathname) {
            return Uri.formatPath(pathname, format);
        }
        else {
            var parts;
            var lastDirectorySeparatorIndex = pathname.lastIndexOf(Uri.PATH_DELIMITER);
            if (pathComponents & 16 /* Directory */) {
                var dirname;
                if (lastDirectorySeparatorIndex === (pathname.length - 1)) {
                    dirname = Uri.formatPath(pathname, format);
                }
                else if (lastDirectorySeparatorIndex > -1) {
                    dirname = Uri.formatPath(pathname.substr(0, lastDirectorySeparatorIndex + 1), format);
                }
                if (pathComponents === 16 /* Directory */) {
                    return dirname;
                }
                if (!parts) {
                    parts = [];
                }
                parts.push(dirname);
            }
            var fileComponents = pathComponents & UriComponents.Filename;
            if (fileComponents && lastDirectorySeparatorIndex < (pathname.length - 1)) {
                var filename;
                if (lastDirectorySeparatorIndex > -1) {
                    filename = pathname.substr(lastDirectorySeparatorIndex + 1);
                }
                else {
                    filename = pathname;
                }
                if (fileComponents === UriComponents.Filename) {
                    filename = Uri.formatPath(filename, format);
                    if (pathComponents === UriComponents.Filename) {
                        return filename;
                    }
                    if (!parts) {
                        parts = [];
                    }
                    parts.push(filename);
                }
                else {
                    var lastExtensionSeparatorIndex = filename.lastIndexOf(Uri.EXTENSION_DELIMITER);
                    if (fileComponents === 32 /* FilenameWithoutExtension */) {
                        var filenameWithoutExtension;
                        if (lastExtensionSeparatorIndex === -1) {
                            filenameWithoutExtension = Uri.formatPath(filename, format);
                        }
                        else if (lastExtensionSeparatorIndex > 0) {
                            filenameWithoutExtension = Uri.formatPath(filename.substr(0, lastExtensionSeparatorIndex), format);
                        }
                        else {
                            filenameWithoutExtension = "";
                        }
                        if (pathComponents === 32 /* FilenameWithoutExtension */) {
                            return filenameWithoutExtension;
                        }
                        if (!parts) {
                            parts = [];
                        }
                        parts.push(filenameWithoutExtension);
                    }
                    else {
                        var extension;
                        if (lastExtensionSeparatorIndex === 0) {
                            extension = Uri.formatPath(filename, format);
                        }
                        else if (lastExtensionSeparatorIndex > 0) {
                            extension = Uri.formatPath(filename.substr(lastExtensionSeparatorIndex), format);
                        }
                        else {
                            extension = "";
                        }
                        return extension;
                    }
                }
            }
        }
        if (parts) {
            return parts.join("");
        }
        return "";
    };
    /*
    UriParser regular expression breakdown (based loosely on http://tools.ietf.org/html/rfc3986#appendix-A):
        ^
        ([a-z][a-z0-9+.\-]*[:|])?                                               ; 1 - scheme
        (?:                                                                     ; authority
            [\\/]{2}                                                            ; "//"
            (?:((?:[\w\-._~!$&'()*+,;=:]|%[a-f0-9]{2})*)@)?                     ; 2 - [ userinfo "@" ]
            (\[[^\[\]]+\]|[\w\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF\.\-_]*)    ; 3 - host (supports IANA domain names)
            (?:\:(\d+))?                                                        ; 4 - [ ":" port ]
            |(?![\\/]{2})                                                       ; if no authority, disallow a path that starts with "//" (from production `path-absolute`)
        )
        (([^/\\?#]*:)?[^?#]*?)                                                  ; 5 - path, 6 - segment with scheme delimiter, manually disallowed if scheme is missing
        (\?[^#]*?)?                                                             ; 7 - [ "?" query ]
        (#.*?)?                                                                 ; 8 - [ "#" fragment ]
        $
    */
    Uri.UriParser = /^(?:([a-z][a-z0-9+.\-]*)[:|])?(?:[\\/]{2}(?:((?:[\w\-._~!$&'()*+,;=:]|%[a-f0-9]{2})*)@)?(\[[^\[\]]+\]|[\w\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF\.\-_]*)(?:\:(\d+))?|(?![\\/]{2}))(([^/\\?#]*:)?[^?#]*?)(?:\?([^#]*?))?(?:#(.*?))?$/i;
    Uri.DosPath = /^([a-z]\:|[\\/]{2,}[^\\/@:?#]+)[\\/]/i;
    Uri.SCHEME_INDEX = 1;
    Uri.USERINFO_INDEX = 2;
    Uri.HOSTNAME_INDEX = 3;
    Uri.PORT_INDEX = 4;
    Uri.PATHNAME_INDEX = 5;
    Uri.SCHEMESEGMENT_INDEX = 6;
    Uri.SEARCH_INDEX = 7;
    Uri.HASH_INDEX = 8;
    Uri.SCHEME_DELIMITER = "//";
    Uri.PATH_DELIMITER = "/";
    Uri.DOS_PATH_DELIMITER = "\\";
    Uri.UNC_ROOT = "\\\\";
    Uri.USERINFO_DELIMITER = "@";
    Uri.SEARCH_DELIMITER = "?";
    Uri.HASH_DELIMITER = "#";
    Uri.CURRENT_DIRECTORY_TOKEN = ".";
    Uri.PARENT_DIRECTORY_TOKEN = "..";
    Uri.PROTOCOL_DELIMITER = ":";
    Uri.PORT_DELIMITER = ":";
    Uri.EXTENSION_DELIMITER = ".";
    Uri.DEFAULT_PORT_HTTP = 80;
    Uri.DEFAULT_PORT_HTTPS = 443;
    /**
     * Specifies the characters that separate the communications protocol scheme from the address portion of the URI.
     */
    Uri.SchemeDelimiter = "://";
    Uri.UriSchemeHttp = "http";
    Uri.UriSchemeHttps = "https";
    Uri.UriSchemeFile = "file";
    Uri.UriSchemeData = "data";
    return Uri;
})();
exports.Uri = Uri;
function create(uri, kindOrRelativeUri) {
    return new Uri(uri, kindOrRelativeUri);
}
exports.create = create;
//# sourceMappingURL=F:/Workspaces/SourceMaps/lib/uri.js.map