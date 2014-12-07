/**
 * Defines the kinds of `Uri`
 */
export enum UriKind {
    /**
     * The kind of the Uri is indeterminate.
     */
    RelativeOrAbsolute,

    /**
     * The Uri is an absolute Uri.
     */
    Absolute,

    /**
     * The Uri is a relative Uri.
     */
    Relative
}

export enum UriComponents {
    Scheme = 0x1,
    Userinfo = 0x2,
    Hostname = 0x4,
    Port = 0x8,
    Directory = 0x10,
    FilenameWithoutExtension = 0x20,
    Extension = 0x40,
    Filename = FilenameWithoutExtension | Extension,
    Pathname = Directory | Filename,
    Search = 0x80,
    Hash = 0x100,
    StrongPort = 0x200,
    KeepDelimiter = 0x400,
    AbsoluteUri = Scheme | Userinfo | Hostname | Port | Pathname | Search | Hash,
    HostnameAndPort = Hostname | StrongPort,
    StrongAuthority = Userinfo | Hostname | StrongPort,
    Origin = Scheme | Hostname | Port,
    PathnameAndSearch = Pathname | Search,
}

export enum UriFormat {
    UriEscaped = 1,
    Unescaped = 2,
    SafeUnescaped = 3
}

/**
 * Provides an object representation of a uniform resource identifier (URI) and easy access to parts of the URI.
 */
export class Uri {
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
    private static UriParser: RegExp = /^(?:([a-z][a-z0-9+.\-]*)[:|])?(?:[\\/]{2}(?:((?:[\w\-._~!$&'()*+,;=:]|%[a-f0-9]{2})*)@)?(\[[^\[\]]+\]|[\w\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF\.\-_]*)(?:\:(\d+))?|(?![\\/]{2}))(([^/\\?#]*:)?[^?#]*?)(?:\?([^#]*?))?(?:#(.*?))?$/i;
    private static DosPath: RegExp = /^([a-z]\:|[\\/]{2,}[^\\/@:?#]+)[\\/]/i;

    private static /*const*/ SCHEME_INDEX = 1;
    private static /*const*/ USERINFO_INDEX = 2;
    private static /*const*/ HOSTNAME_INDEX = 3;
    private static /*const*/ PORT_INDEX = 4;
    private static /*const*/ PATHNAME_INDEX = 5;
    private static /*const*/ SCHEMESEGMENT_INDEX = 6;
    private static /*const*/ SEARCH_INDEX = 7;
    private static /*const*/ HASH_INDEX = 8;
    private static /*const*/ SCHEME_DELIMITER = "//";
    private static /*const*/ PATH_DELIMITER = "/";
    private static /*const*/ DOS_PATH_DELIMITER = "\\";
    private static /*const*/ UNC_ROOT = "\\\\";
    private static /*const*/ USERINFO_DELIMITER = "@";
    private static /*const*/ SEARCH_DELIMITER = "?";
    private static /*const*/ HASH_DELIMITER = "#";
    private static /*const*/ CURRENT_DIRECTORY_TOKEN = ".";
    private static /*const*/ PARENT_DIRECTORY_TOKEN = "..";
    private static /*const*/ PROTOCOL_DELIMITER = ":";
    private static /*const*/ PORT_DELIMITER = ":";
    private static /*const*/ EXTENSION_DELIMITER = ".";
    private static /*const*/ DEFAULT_PORT_HTTP = 80;
    private static /*const*/ DEFAULT_PORT_HTTPS = 443;

    private _raw: string;
    private _scheme: string;
    private _userinfo: string;
    private _hostname: string;
    private _port: number;
    private _pathname: string;
    private _search: string;
    private _hash: string;
    private _components: UriComponents;

    /**
     * Specifies the characters that separate the communications protocol scheme from the address portion of the URI.
     */
    public static /*const*/ SchemeDelimiter = "://";
    public static /*const*/ UriSchemeHttp = "http";
    public static /*const*/ UriSchemeHttps = "https";
    public static /*const*/ UriSchemeFile = "file";
    public static /*const*/ UriSchemeData = "data";

    /**
     * Initializes a new instance of the `Uri` class with the specified URI.
     * @param text A URI.
     */
    constructor(text: string);

    /**
     * Initializes a new instance of the `Uri` class with the specified URI.
     * @param text A URI.
     * @param kind Specifies whether the URI string is relative or absolute.
     */
    constructor(text: string, kind: UriKind);

    /**
     * Initializes a new instance of the `Uri` class from a specified base `Uri` instance and a relative URI.
     * @param baseUri A base `Uri` instance.
     * @param uri A relative URI.
     */
    constructor(baseUri: Uri, uri: string);

    /**
     * Initializes a new instance of the `Uri` class from a specified base `Uri` instance and a relative `Uri` instance.
     * @param baseUri A base `Uri` instance.
     * @param uri A relative `Uri` instance.
     */
    constructor(baseUri: Uri, uri: Uri);

    constructor(...args: any[]) {
        if (args.length >= 2 && args[0] instanceof Uri) {
            var baseUri = <Uri>args[0];
            var relativeUri: Uri;
            if (args[1] instanceof Uri) {
                relativeUri = <Uri>args[1];
            } else if (args[1] !== null && args[1] !== undefined) {
                relativeUri = new Uri(String(args[1]), UriKind.RelativeOrAbsolute);
            } else {
                throw new TypeError("Missing required argument: uri.");
            }

            Uri.mergeCore(baseUri, relativeUri, this);
        } else if (args.length >= 1 && args[0] !== null && args[0] !== undefined) {
            var text = String(args[0]);
            var kind = UriKind.Absolute;
            if (args.length >= 2) {
                if (typeof args[1] === "number") {
                    kind = <UriKind>args[1];
                } else if (typeof args[1] !== "undefined") {
                    throw new TypeError("Invalid argument: kind.");
                }
            }

            Uri.parseCore(text, kind, this);
        } else {
            throw new TypeError("Argument not optional.");
        }
    }

    /**
     * Gets a value indicating whether the pathname for the `Uri` is a root path.
     */
    public get isRooted(): boolean { return this.isAbsolute || /^\//.test(this.pathname); }

    /**
     * Gets a value indicating whether the `Uri` is an absolute URI.
     */
    public get isAbsolute(): boolean {
        // the following supports backwards compatibility with F12's odd handling of file:// protocols, where it allows "file://..\path" and
        // "file://.\path", and treats those and "file:///..\path" as relative URLs.
        if (this._scheme === Uri.UriSchemeFile && typeof this._pathname === "string" && /^[\\/]?\.{1,2}([\\/]|$)/.test(this._pathname)) {
            return false;
        }

        return !!this._scheme;
    }

    /**
     * Gets a value indicating whether the `Uri` is a file URI.
     */
    public get isFile(): boolean {
        return this._scheme === Uri.UriSchemeFile;
    }

    /**
     * Gets a value indicating whether the `Uri` is a UNC path.
     */
    public get isUnc(): boolean {
        return this.isFile && !!this._hostname;
    }

    /**
     * Gets a value indicating whether the `Uri` is a DOS path.
     */
    public get isDosPath(): boolean {
        return this.isFile && !this._hostname && /^\/?[a-z][:|]/i.test(this._pathname);
    }

    /**
     * Gets a value indicating whether the `Uri` is using the default port for the current scheme.
     */
    public get hasDefaultPort(): boolean {
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
    }

    /**
     * Gets the raw string provided for the `Uri`.
     */
    public get raw(): string { return this._raw; }

    /**
     * Gets the origin from the `Uri`.
     */
    public get origin(): string { return this.getComponentsCore(UriComponents.Origin, UriFormat.UriEscaped); }

    /**
     * Gets the authority component of the `Uri`.
     */
    public get authority(): string { return this.getComponentsCore(UriComponents.HostnameAndPort, UriFormat.UriEscaped); }

    /**
     * Gets the protocol (e.g. "http:", "https:") from the `Uri`.
     */
    public get protocol(): string { return this.getComponentsCore(UriComponents.Scheme | UriComponents.KeepDelimiter, UriFormat.UriEscaped); }

    /**
     * Gets the scheme (e.g. "http", "https") from the `Uri`.
     */
    public get scheme(): string { return this.getComponentsCore(UriComponents.Scheme, UriFormat.UriEscaped); }

    /**
     * Gets the userinfo component of the `Uri`.
     */
    public get userinfo(): string { return this.getComponentsCore(UriComponents.Userinfo, UriFormat.UriEscaped); }

    /**
     * Gets the hostname and optional port of the `Uri`.
     */
    public get host(): string { return this.getComponentsCore(UriComponents.HostnameAndPort, UriFormat.UriEscaped); }

    /**
     * Gets the hostname of the `Uri`.
     */
    public get hostname(): string { return this.getComponentsCore(UriComponents.Hostname, UriFormat.UriEscaped); }

    /**
     * Gets the pathname component of the `Uri`.
     */
    public get pathname(): string { return this.getComponentsCore(UriComponents.Pathname, UriFormat.UriEscaped); }        

    /**
     * Gets the pathname and search components of the `Uri`.
     */
    public get pathnameAndSearch(): string { return this.getComponentsCore(UriComponents.PathnameAndSearch, UriFormat.UriEscaped); }        

    /**
     * Gets the search component of the `Uri`.
     */
    public get search(): string { return this.getComponentsCore(UriComponents.Search | UriComponents.KeepDelimiter, UriFormat.UriEscaped); }

    /**
     * Gets the fragment component of the `Uri`.
     */
    public get hash(): string { return this.getComponentsCore(UriComponents.Hash | UriComponents.KeepDelimiter, UriFormat.UriEscaped); }

    /**
     * Gets the port component of the `Uri`.
     */
    public get port(): number {
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
    }

    /**
     * Gets the absolute URI.
     */
    public get absoluteUri(): string { return this.getComponentsCore(UriComponents.AbsoluteUri, UriFormat.UriEscaped); }

    /**
     * Gets the absolute path of the `Uri`.
     */
    public get absolutePath(): string {
        var pathname = this.getComponentsCore(UriComponents.Pathname | UriComponents.KeepDelimiter, UriFormat.UriEscaped);
        if (this.isDosPath) {
            pathname = pathname.substr(1);
        }

        return pathname;
    }

    /**
     * Gets the local DOS or UNC path for a file URI.
     */
    public get localPath(): string {
        if (this.isUnc || this.isDosPath) {
            var pathname = this.getComponentsCore(UriComponents.Pathname | UriComponents.KeepDelimiter, UriFormat.UriEscaped);
            pathname = pathname.replace(Uri.PATH_DELIMITER, Uri.DOS_PATH_DELIMITER);
            if (this.isUnc) {
                return Uri.UNC_ROOT + this.hostname + pathname;
            } else if (this.isDosPath) {
                return pathname.substr(1);
            }
        }

        return "";
    }

    /**
     * Gets the path segments that make up the absolute path of the URI
     */
    public get segments(): string[] {
        var pathname = this.getComponentsCore(UriComponents.Pathname | UriComponents.KeepDelimiter, UriFormat.UriEscaped);
        if (pathname.length > 1) {
            pathname = pathname.substr(1);
            return pathname.split(Uri.PATH_DELIMITER);
        }

        return [];
    }

    /**
     * Creates a new instance of the `Uri` class with the specified URI.
     * @param text A URI.
     * @returns A new `Uri`.
     */
    public static parse(text: string): Uri;

    /**
     * Creates a new instance of the `Uri` class with the specified URI.
     * @param text A URI.
     * @param kind Specifies whether the URI string is relative or absolute.
     * @returns A new `Uri`.
     */
    public static parse(text: string, kind: UriKind): Uri;

    /**
     * Creates a new instance of the `Uri` class with the specified URI.
     * @param text A URI.
     * @returns A new `Uri`.
     */
    public static parse(text: string, kind: UriKind = UriKind.Absolute): Uri {
        return new Uri(text, kind);
    }

    /**
     * Creates a new instance of the `Uri` class with the specified URI.
     * @param text A URI.
     * @returns A new `Uri` if it could be successfully parsed; otherwise, `undefined`.
     */
    public static tryParse(text: string): Uri;

    /**
     * Creates a new instance of the `Uri` class with the specified URI.
     * @param text A URI.
     * @param kind Specifies whether the URI string is relative or absolute.
     * @returns A new `Uri` if it could be successfully parsed; otherwise, `undefined`.
     */
    public static tryParse(text: string, kind: UriKind): Uri;

    public static tryParse(text: string, kind: UriKind = UriKind.Absolute): Uri {
        if (text === null || text === undefined) {
            throw new TypeError("Missing required argument: text.");
        }

        return Uri.parseCore(text, kind, /*instance*/ undefined);
    }

    /**
     * Creates a new instance of the `Uri` class from a specified base `Uri` instance and a relative `Uri` instance.
     * @param baseUri A base `Uri` instance.
     * @param uri A relative `Uri` instance.
     * @returns A new `Uri` if it could be successfully parsed; otherwise, `undefined`.
     */
    public static tryMerge(baseUri: Uri, uri: Uri): Uri {
        if (baseUri === null || baseUri === undefined) {
            throw new TypeError("Missing required argument: baseUri.");
        }

        if (uri === null || uri === undefined) {
            throw new TypeError("Missing required argument: uri.");
        }

        return Uri.mergeCore(baseUri, uri, /*instance*/ undefined);
    }

    /**
     * Creates a new `Uri` instance with the provided components.
     * @param components An object containing named components for the new `Uri`.
     * @returns A new `Uri` instance.
     */
    public static create(data: { uri?: string; scheme?: string; userinfo?: string; hostname?: string; port?: number; pathname?: string; search?: string; hash?: string; keepDelimiter?: boolean; }): Uri {
        if (!data) {
            data = {};
        }

        var scheme: string;
        var userinfo: string;
        var hostname: string;
        var portString: string;
        var port: number;
        var pathname: string;
        var hasColonInFirstPathSegment: boolean;
        var search: string;
        var hash: string;
        var keepDelimiter = false;
        var components: UriComponents = 0;

        if (typeof data.keepDelimiter === "boolean") {
            keepDelimiter = data.keepDelimiter;
        }

        if (typeof data.scheme === "string") {
            scheme = decodeURIComponent(data.scheme.toLowerCase());
            components |= UriComponents.Scheme;
            if (scheme === Uri.UriSchemeHttp || scheme === Uri.UriSchemeHttps) {
                components |= UriComponents.StrongPort;
            }
        }

        if (typeof data.userinfo === "string") {
            userinfo = data.userinfo.toLowerCase();
            components |= UriComponents.Userinfo;
        }

        if (typeof data.hostname === "string") {
            hostname = data.hostname.toLowerCase();
            components |= UriComponents.Hostname;
        }

        if (typeof data.port === "number") {
            if (data instanceof Uri) {
                var componentsUri = <Uri>data;
                port = componentsUri._port;
            } else {
                if (data.port < 0) {
                    throw new RangeError("Invalid port.");
                }

                port = data.port;
            }

            if (typeof port === "number") {
                components |= UriComponents.Port | UriComponents.StrongPort;
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

            components |= UriComponents.Search;
        }

        if (data.hash) {
            hash = data.hash;
            if (!keepDelimiter && (hash.length > 0 && hash.charAt(0) === Uri.HASH_DELIMITER)) {
                hash = hash.substr(1);
            }

            components |= UriComponents.Hash;
        }

        var uri = <Uri>Object.create(Uri.prototype);
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
    }

    /**
     * Determines whether two `Uri` instances are equivalent.
     * @param x A `Uri` instance.
     * @param y A `Uri` instance.
     * @param ignoreCase A value indicating whether the comparison is case insensitive (default `false`).
     */
    public static equals(x: Uri, y: Uri, ignoreCase?: boolean): boolean;
    public static equals(x: Uri, y: string, ignoreCase?: boolean): boolean;
    public static equals(x: string, y: Uri, ignoreCase?: boolean): boolean;
    public static equals(x: string, y: string, ignoreCase?: boolean): boolean;
    public static equals(xAny: any, yAny: any, ignoreCase: boolean = false): boolean {
        if (xAny === yAny) {
            return true;
        } else if (xAny === null) {
            return yAny === null;
        } else if (yAny === null) {
            return false;
        } else if (xAny === undefined) {
            return yAny === undefined;
        } else if (yAny === undefined) {
            return false;
        } else {
            var x: Uri;
            var y: Uri;

            if (typeof xAny === "string") {
                x = new Uri(<string>xAny, UriKind.RelativeOrAbsolute);
            } else {
                x = <Uri>xAny;
            }

            if (typeof yAny === "string") {
                y = new Uri(<string>yAny, UriKind.RelativeOrAbsolute);
            } else {
                y = <Uri>yAny;
            }

            if (Uri.stringEquals(x._raw, y._raw, ignoreCase)) {
                return true;
            } else if (x._scheme === y._scheme &&
                x._userinfo === y._userinfo &&
                x._hostname === y._hostname &&
                x.port === y.port &&
                Uri.stringEquals(x._pathname, y._pathname, ignoreCase) &&
                Uri.stringEquals(x._search, y._search, ignoreCase) &&
                Uri.stringEquals(x._hash, y._hash, ignoreCase)) {
                return true;
            } else {
                return false;
            }
        }
    }

    /**
     * Compares two `Uri` instances.
     * @param x A `Uri` instance.
     * @param y A `Uri` instance.
     * @param ignoreCase A value indicating whether the comparison is case insensitive (default `false`).
     * @returns A positive value if `x` is greater than `y`, a negative value if `x` is less than `y`, or zero if they are equivalent.
     */
    public static compare(x: Uri, y: Uri, partsToCompare: UriComponents = UriComponents.AbsoluteUri, compareFormat: UriFormat = UriFormat.UriEscaped, ignoreCase: boolean = false): number {
        if (typeof partsToCompare !== "number") {
            throw new TypeError("Invalid argument: partsToCompare.");
        }

        if (typeof compareFormat !== "number") {
            throw new TypeError("Invalid argument: compareFormat.");
        }

        if ((compareFormat & ~UriFormat.SafeUnescaped) !== 0) {
            throw new RangeError("Argument out of range: compareFormat.");
        }

        if (x === y) {
            return 0;
        } else if (x === null || x === undefined) {
            if (y === null || y === undefined) {
                return 0;
            }

            return -1;
        } else if (y === null || y === undefined) {
            return +1;
        } else if (!x.isAbsolute || !y.isAbsolute) {
            if (x.isAbsolute) {
                return +1;
            } else if (y.isAbsolute) {
                return -1;
            } else {
                return Uri.compareStrings(x.raw, y.raw, ignoreCase);
            }
        } else {
            return Uri.compareStrings(
                x.getComponentsCore(partsToCompare, compareFormat),
                y.getComponentsCore(partsToCompare, compareFormat),
                ignoreCase);
        }
    }

    /**
     * Gets the current Uri for the host environment.
     */
    public static getCurrent(): Uri {
        if (typeof self !== "undefined") {
            return new Uri(self.location.href);
        } else {
            return new Uri(".");
        }
    }

    /**
     * Gets a canonical string representation of the `Uri`.
     * @param components The components to include.
     * @param format The output format of the result.
     */
    public getComponents(components: UriComponents, format: UriFormat): string {
        if (typeof components !== "number" || typeof format !== "number") {
            throw new TypeError("Invalid argument: components.");
        }

        if (typeof format !== "number") {
            throw new TypeError("Invalid argument: format.");
        }

        if ((format & ~UriFormat.SafeUnescaped) !== 0) {
            throw new RangeError("Argument out of range: format.");
        }

        components = Uri.adjustComponents(components);
        return this.getComponentsCore(components, format);
    }

    /**
     * Gets a canonical string representation of the `Uri`.
     */
    public toString(): string {
        return this.getComponentsCore(UriComponents.AbsoluteUri, UriFormat.SafeUnescaped);
    }

    /**
     * Gets a canonical representation of the `Uri` when serializing to JSON.
     */
    public toJSON(): any {
        return this.toString();
    }

    /**
     * Determines whether this `Uri` instance shares the same origin as the specified URI.
     * @param uri A URI.
     */
    public isSameOrigin(uri: string): boolean;

    /**
     * Determines whether this `Uri` instance shares the same origin as the specified `Uri` instance.
     * @param uri A `Uri` instance.
     */
    public isSameOrigin(uri: Uri): boolean;

    public isSameOrigin(uriAny: any): boolean {
        if (uriAny === null || uriAny === undefined) {
            throw new TypeError("Missing required argument: uri.");
        }

        var uri: Uri = uriAny instanceof Uri ? uriAny : new Uri(String(uriAny));
        if (this.isAbsolute) {
            return this.getComponentsCore(UriComponents.Origin, UriFormat.UriEscaped) === uri.getComponentsCore(UriComponents.Origin, UriFormat.UriEscaped);
        }

        return !uri.isAbsolute;
    }

    /**
     * Determines whether the current `Uri` instance is a base of the specified `Uri` instance.
     * @param uri A `Uri` instance.
     */
    public isBaseOf(uri: Uri): boolean {
        if (uri === null || uri === undefined) {
            throw new TypeError("Missing required argument: uri.");
        }

        var thisComponents = this.getComponentsCore(UriComponents.AbsoluteUri & ~UriComponents.Hash, UriFormat.SafeUnescaped);
        var otherComponents = this.getComponentsCore(UriComponents.AbsoluteUri & ~UriComponents.Hash, UriFormat.SafeUnescaped);

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
    }

    /**
     * Creates a new `Uri` instance that is the relative path from this `Uri` instance to the provided `Uri` instance.
     * @param uri The destination `Uri` instance.
     */
    public makeRelative(uri: Uri): Uri {
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

        var relativeUriString = relativePath + uri.getComponentsCore(UriComponents.Search | UriComponents.Hash, UriFormat.UriEscaped);
        return new Uri(relativeUriString, UriKind.Relative);
    }

    /**
     * Determines whether this `Uri` instance is equivalent to the specified `Uri` instance.
     * @param uri A `Uri` instance.
     * @param ignoreCase A value indicating whether the comparision is case insensitive (default `false`).
     */
    public equals(uri: Uri, ignoreCase?: boolean): boolean;
    public equals(uri: string, ignoreCase?: boolean): boolean;
    public equals(uriAny: any, ignoreCase?: boolean): boolean {
        return Uri.equals(this, uriAny, ignoreCase);
    }

    /** Compares whether two strings are equivalent */
    private static stringEquals(x: string, y: string, ignoreCase: boolean): boolean {
        if (ignoreCase && typeof x === "string" && typeof y === "string") {
            x = x.toLowerCase();
            y = y.toLowerCase();
        }

        return x === y;
    }

    /** Compares two strings */
    private static compareStrings(x: string, y: string, ignoreCase: boolean): number {
        if (ignoreCase && typeof x === "string" && typeof y === "string") {
            x = x.toLowerCase();
            y = y.toLowerCase();
        }

        if (x > y) {
            return +1;
        } else if (x < y) {
            return -1;
        } else {
            return 0;
        }
    }

    /** Compares two numbers */
    private static compareNumbers(x: number, y: number): number {
        if (x < y) {
            return -1;
        } else if (x > y) {
            return +1;
        } else {
            return 0;
        }
    }

    /** Formats the userinfo component */
    private static formatUserinfo(userinfo: string, format: UriFormat): string {
        switch (format) {
            case UriFormat.UriEscaped:
                // When we escape the userinfo segment, we force any unencoded '?' or '#' to be encoded. 
                // The '%' character will remain unescaped.
                userinfo = Uri.escape(userinfo, /*forced*/ "?#", /*reserved*/ "%");
                break;

            case UriFormat.Unescaped:
                // we want a completely unescaped string
                userinfo = decodeURIComponent(userinfo);
                break;

            case UriFormat.SafeUnescaped:
                userinfo = Uri.unescape(userinfo, /*reserved*/ "@/\\", /*mode*/ "safe");
                break;
        }

        return userinfo;
    }

    /** Formats the path component */
    private static formatPath(pathname: string, format: UriFormat): string {
        switch (format) {
            case UriFormat.UriEscaped:
                pathname = Uri.escape(pathname, "?#", "%");
                break;

            case UriFormat.Unescaped:
                pathname = decodeURIComponent(pathname);
                break;

            case UriFormat.SafeUnescaped:
                pathname = Uri.unescape(pathname, "?#", "safe");
                break;
        }

        return pathname;
    }

    /** Formats the search component */
    private static formatSearch(search: string, format: UriFormat): string {
        switch (format) {
            case UriFormat.UriEscaped:
                search = Uri.escape(search, "#", "%");
                break;

            case UriFormat.Unescaped:
                search = Uri.unescape(search, "#", "all");
                break;

            case UriFormat.SafeUnescaped:
                search = Uri.unescape(search, "#", "safe");
                break;
        }

        return search;
    }

    /** Formats the hash component. */
    private static formatHash(hash: string, format: UriFormat): string {
        switch (format) {
            case UriFormat.UriEscaped:
                hash = Uri.escape(hash, "", "%");
                break;

            case UriFormat.Unescaped:
                hash = Uri.unescape(hash, "#", "all");
                break;

            case UriFormat.SafeUnescaped:
                hash = Uri.unescape(hash, "#", "safe");
                break;
        }

        return hash;
    }

    /** Escapes a URI component */
    private static escape(text: string, forced: string, reserved: string): string {
        if (!text) {
            return text;
        }

        var parts: string[] = [];
        var start: number = 0;
        var mode: string = "";
        for (var i = 0; i < text.length; i++) {
            var ch = text.charAt(i);
            if (forced.indexOf(ch) > -1) {
                mode = "forced";
            } else if (reserved.indexOf(ch) > -1) {
                mode = "reserved";
            }

            if (mode !== "") {
                if (start < i) {
                    parts.push(encodeURI(text.substring(start, i)));
                }

                start = i + 1;

                if (mode === "forced") {
                    parts.push(encodeURIComponent(ch));
                } else if (mode === "reserved") {
                    parts.push(ch);
                }

                mode = "";
            }
        }

        if (start < i) {
            parts.push(encodeURI(text.substring(start, i)));
        }

        return parts.join("");
    }

    /** Unescapes an escaped URI component */
    private static unescape(text: string, reserved: string, mode: string): string {
        if (!text) {
            return text;
        }

        var parts: string[] = [];
        var start: number = 0;
        var escapeReserved: boolean = false;
        var writeCurrent: boolean = false;
        var i: number;

        var pushEscaped = (ch: string) => {
            parts.push(encodeURIComponent(ch));
        };

        var pushUnescaped = (ch: string, size: number) => {
            parts.push(ch);
            i += size;
            start = i + 1;
        };

        var pushChunk = () => {
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
                        } else if (unit < 0xe0 && i + 6 <= text.length) {
                            segment = text.substr(i, 6);
                            if (/^(%[a-f\d]{2}){2}$/i.test(segment)) {
                                ch = decodeURIComponent(segment);
                                size = 5;
                            }
                        } else if (unit < 0xf0 && i + 9 <= text.length) {
                            segment = text.substr(i, 9);
                            if (/^(%[a-f\d]{2}){3}$/i.test(segment)) {
                                ch = decodeURIComponent(segment);
                                size = 8;
                            }
                        } else if (unit < 0xf5 && i + 12 <= text.length) {
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
                    } else if (ch.length !== 1) {
                        continue;
                    } else if (ch === "%" || reserved.indexOf(ch) > -1) {
                        // do not unescape % or any reserved characters
                        i += 2;
                    } else if (/^[;/?:@&=+$#%\\\x00-\x17]$/.test(ch)) {
                        // do not unescape dangerous characters in safe mode
                        i += 2;
                    } else {
                        pushChunk();
                        pushUnescaped(ch, size);
                    }
                }
            } else if (mode === "all") {
                continue;
            } else if (reserved.indexOf(ch) > -1) {
                pushChunk();
                pushEscaped(ch);
            }
        }

        pushChunk();
        return parts.join("");
    }

    /** Parses a URI. */
    private static parseCore(text: string, kind: UriKind, instance: Uri, intern?: boolean): Uri {
        var scheme: string;
        var userinfo: string;
        var hostname: string;
        var portString: string;
        var port: number;
        var pathname: string;
        var hasColonInFirstPathSegment: boolean;
        var search: string;
        var hash: string;
        var components: UriComponents = 0;
        var raw: string = text;
        text = text.trim();
        pathname = text;

        if (kind !== UriKind.Relative) {
            if (Uri.DosPath.test(text)) {
                text = "file:///" + text;
            }

            var m = Uri.UriParser.exec(text);
            if (!m) {
                if (kind === UriKind.Absolute) {
                    if (instance) {
                        throw new URIError();
                    }

                    return;
                }

                kind = UriKind.Relative;
            } else {
                scheme = m[Uri.SCHEME_INDEX];
                userinfo = m[Uri.USERINFO_INDEX];
                hostname = m[Uri.HOSTNAME_INDEX];
                portString = m[Uri.PORT_INDEX];
                pathname = m[Uri.PATHNAME_INDEX];
                hasColonInFirstPathSegment = !!m[Uri.SCHEMESEGMENT_INDEX];
                search = m[Uri.SEARCH_INDEX];
                hash = m[Uri.HASH_INDEX];
                kind = UriKind.Absolute;
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
                if ((/^\.{1,2}$/.test(hostname) && /^([\\/]|$)/.test(pathname)) ||
                    (/^[a-z]$/i.test(hostname) && /^:[\\/]/.test(pathname))) {
                    // fixes: file://./path to file:///./path
                    // fixes: file://../path to file:///../path
                    // fixes: file://c:/path to file:///c:/path
                    pathname = hostname + pathname;
                    hostname = undefined;
                } else if (!hostname) {
                    if (/^[\\/]\.{1,2}/.test(pathname)) {
                        pathname = pathname.substr(1);
                    } else if (/^[\\/]{2,}/.test(pathname)) {
                        pathname = pathname.replace(/^[\\/]{2,}/, "");
                        var hostSeparatorIndex = pathname.indexOf(Uri.PATH_DELIMITER);
                        if (hostSeparatorIndex > -1) {
                            hostname = pathname.substr(0, hostSeparatorIndex);
                            pathname = pathname.substr(hostSeparatorIndex);
                        } else {
                            hostname = pathname;
                            pathname = "";
                        }
                    }
                }
            }
        }

        if (typeof scheme === "string") {
            scheme = scheme.toLowerCase();
            components |= UriComponents.Scheme;
            if (scheme === Uri.UriSchemeHttp || scheme === Uri.UriSchemeHttps) {
                components |= UriComponents.StrongPort;
            }
        }

        if (typeof userinfo === "string") {
            components |= UriComponents.Userinfo;
        }

        if (typeof hostname === "string") {
            hostname = hostname.toLowerCase();
            components |= UriComponents.Hostname;
        }

        if (typeof portString === "string") {
            port = parseInt(portString);
            components |= UriComponents.Port | UriComponents.StrongPort;
        }

        if (typeof pathname === "string" && kind !== UriKind.Relative) {
            pathname = Uri.normalizePath(pathname);
        }

        if (pathname) {
            components |= UriComponents.Pathname;
        }

        if (typeof search === "string") {
            components |= UriComponents.Search;
        }

        if (typeof hash === "string") {
            components |= UriComponents.Hash;
        }

        if (!instance) {
            instance = <Uri>Object.create(Uri.prototype);
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
    }

    /** Merges two `Uri` instances. */
    private static mergeCore(baseUri: Uri, uri: Uri, instance: Uri, intern?: boolean): Uri {
        if (!instance && uri.isAbsolute) {
            return uri;
        }

        var scheme: string;
        var userinfo: string;
        var hostname: string;
        var port: number;
        var pathname: string;
        var search: string;
        var hash: string;
        var components: UriComponents = 0;

        if (uri._scheme) {
            scheme = uri._scheme;
            userinfo = uri._userinfo;
            hostname = uri._hostname;
            port = uri._port;
            pathname = Uri.normalizePath(uri._pathname);
            search = uri._search;
        } else {
            if (uri._hostname) {
                userinfo = uri._userinfo;
                hostname = uri._hostname;
                port = uri._port;
                pathname = Uri.normalizePath(uri._pathname);
                search = uri._search;
            } else {
                if (!uri._pathname) {
                    pathname = baseUri._pathname;
                    if (uri._search) {
                        search = uri._search;
                    } else {
                        search = baseUri._search;
                    }
                } else {
                    if (uri._pathname.charAt(0) === Uri.PATH_DELIMITER) {
                        pathname = Uri.normalizePath(uri._pathname);
                    } else {
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
            components |= UriComponents.Scheme;
            if (scheme === Uri.UriSchemeHttp || scheme === Uri.UriSchemeHttps) {
                components |= UriComponents.StrongPort;
            }
        }

        if (typeof userinfo === "string") {
            components |= UriComponents.Userinfo;
        }

        if (typeof hostname === "string") {
            components |= UriComponents.Hostname;
        }

        if (typeof port === "number") {
            components |= UriComponents.Port | UriComponents.StrongPort;
        }

        if (pathname) {
            components |= UriComponents.Pathname;
        }

        if (typeof search === "string") {
            components |= UriComponents.Search;
        }

        if (typeof hash === "string") {
            components |= UriComponents.Hash;
        }

        if (!instance) {
            instance = <Uri>Object.create(Uri.prototype);
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
    }

    /** Merges two paths. */
    private static mergePath(basepath: string, relativepath: string): string {
        var lastPathDelimiterIndex = -1;
        if (basepath) {
            lastPathDelimiterIndex = basepath.lastIndexOf(Uri.PATH_DELIMITER);
        }

        if (lastPathDelimiterIndex >= 0) {
            return basepath.substr(0, lastPathDelimiterIndex + 1) + relativepath;
        } else {
            return relativepath;
        }
    }

    /** Normalizes a path. */
    private static normalizePath(pathname: string): string {
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

        // normalize path segments
        for (var i = 0; i < parts.length;) {
            var part = parts[i];
            switch (part) {
                case Uri.CURRENT_DIRECTORY_TOKEN: {
                    if (i !== 0 || rooted) {
                        parts.splice(i, 1);

                        if (i === parts.length) {
                            parts.push("");
                        }

                        continue;
                    }

                    break;
                }

                case Uri.PARENT_DIRECTORY_TOKEN: {
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
    }

    /** Computes the difference between two paths. */
    private static computePathDifference(x: string, y: string, ignoreCase: boolean): string {
        var i: number;
        var lastPathIndex: number = -1;
        for (i = 0; i < x.length && i < y.length && Uri.compareStrings(x.charAt(i), y.charAt(i), ignoreCase) === 0; i++) {
            if (x.charAt(i) === Uri.PATH_DELIMITER) {
                lastPathIndex = i;
            }
        }

        if (i === 0) {
            return y;
        } else if (i === x.length && i === y.length) {
            return "";
        }

        var parts: string[] = [];
        for (; i < x.length; i++) {
            if (x.charAt(i) === Uri.PATH_DELIMITER) {
                parts.push(Uri.PARENT_DIRECTORY_TOKEN, Uri.PATH_DELIMITER);
            }
        }

        if (parts.length === 0 && y.length - 1 === lastPathIndex) {
            return Uri.CURRENT_DIRECTORY_TOKEN + Uri.PATH_DELIMITER;
        }

        return parts.join("") + y.substr(lastPathIndex + 1);
    }

    /** Adjusts the requested components to make them a valid fragment */
    private static adjustComponents(components: UriComponents): UriComponents {
        if (components & UriComponents.StrongPort) {
            components |= UriComponents.Port;
        }

        // Userinfo included with anything other than KeepDelimiter requires a hostname
        if (components & UriComponents.Userinfo && (components & ~UriComponents.KeepDelimiter) !== UriComponents.Userinfo) {
            components |= UriComponents.Hostname;
        }

        // Port included with anything other than KeepDeleimiter or StrongPort requires a hostname
        if (components & UriComponents.Port && (components & ~(UriComponents.KeepDelimiter | UriComponents.StrongPort)) !== UriComponents.Port) {
            components |= UriComponents.Hostname;
        }

        // Hash along with any part of Origin requires the full path and Search.
        // Search along with any part of Origin requires a full path.
        // Extension along with any part of Origin requires the directory and file.
        // File along with any part of Origin requires the directory.
        if (components & UriComponents.Origin) {
            if (components & UriComponents.Hash) {
                components |= UriComponents.PathnameAndSearch;
            } else if (components & UriComponents.Search) {
                components |= UriComponents.Pathname;
            } else if (components & UriComponents.Extension) {
                components |= UriComponents.Directory | UriComponents.FilenameWithoutExtension;
            } else if (components & UriComponents.FilenameWithoutExtension) {
                components |= UriComponents.Directory;
            }
        }

        // Directory along with Extension requires the Filename
        if ((components & UriComponents.Pathname) === (UriComponents.Directory | UriComponents.Extension)) {
            components |= UriComponents.FilenameWithoutExtension;
        }

        return components;
    }

    /** Gets the rebuilt URI string for the specified URI components and format. */
    private getComponentsCore(components: UriComponents, format: UriFormat): string {
        var parts: string[] = [];

        // Scheme
        var isFileScheme = false;
        var finalComponents = components & this._components;
        if (finalComponents & UriComponents.Scheme) {
            parts.push(this._scheme);
            isFileScheme = this._scheme === Uri.UriSchemeFile;
            if (components !== UriComponents.Scheme) {
                parts.push(Uri.PROTOCOL_DELIMITER);
            }
        }

        if ((components & (UriComponents.Scheme | UriComponents.KeepDelimiter)) && (finalComponents & (UriComponents.StrongAuthority | UriComponents.Port)) || isFileScheme) {
            parts.push(Uri.SCHEME_DELIMITER);
        }

        if (finalComponents & (UriComponents.StrongAuthority | UriComponents.Port)) {
            // Userinfo
            if (finalComponents & UriComponents.Userinfo) {
                parts.push(Uri.formatUserinfo(this._userinfo, format));
                if (components !== UriComponents.Userinfo) {
                    parts.push(Uri.USERINFO_DELIMITER);
                }
            }

            // Hostname
            if (finalComponents & UriComponents.Hostname) {
                parts.push(this._hostname);
            }

            // Port
            if (finalComponents & (UriComponents.Port | UriComponents.StrongPort)) {
                parts.push(Uri.PORT_DELIMITER);
                parts.push(this.port.toString());
            }
        }

        // Path
        if (components & UriComponents.Pathname) {
            parts.push(this.getCanonicalPath(components, format));
        }

        // Search
        if (finalComponents & UriComponents.Search) {
            if (components !== UriComponents.Search) {
                parts.push(Uri.SEARCH_DELIMITER);
            }

            parts.push(Uri.formatSearch(this._search, format));
        }

        // Hash
        if (finalComponents & UriComponents.Hash) {
            if (components !== UriComponents.Hash) {
                parts.push(Uri.HASH_DELIMITER);
            }

            parts.push(Uri.formatHash(this._hash, format));
        }

        var result = parts.join("");
        return result;
    }

    /** Gets the path segments for the specified URI components and format. */
    private getCanonicalPath(components: UriComponents, format: UriFormat): string {
        var pathname = this._pathname;

        var needsDelimiter = false;
        if ((components & UriComponents.KeepDelimiter)) {
            needsDelimiter = true;
        } else if (this.isAbsolute) {
            if (this.isFile) {
                needsDelimiter = true;
            } else if ((this._components & (UriComponents.Hostname | UriComponents.Pathname)) === (UriComponents.Hostname | UriComponents.Pathname)) {
                needsDelimiter = true;
            }
        }

        if (!(this._components & UriComponents.Pathname) || pathname.length === 0) {
            if ((components & UriComponents.Directory) && needsDelimiter) {
                return Uri.PATH_DELIMITER;
            }

            return "";
        }

        if (components & UriComponents.Directory) {
            var isFirstSlashAbsent = pathname.charAt(0) !== Uri.PATH_DELIMITER;
            if (needsDelimiter && isFirstSlashAbsent) {
                pathname = Uri.PATH_DELIMITER + pathname;
            }
        }

        var pathComponents = components & UriComponents.Pathname;
        if (pathComponents === UriComponents.Pathname) {
            return Uri.formatPath(pathname, format);
        } else {
            var parts: string[];
            var lastDirectorySeparatorIndex = pathname.lastIndexOf(Uri.PATH_DELIMITER);
            if (pathComponents & UriComponents.Directory) {
                var dirname: string;
                if (lastDirectorySeparatorIndex === (pathname.length - 1)) {
                    dirname = Uri.formatPath(pathname, format);
                } else if (lastDirectorySeparatorIndex > -1) {
                    dirname = Uri.formatPath(pathname.substr(0, lastDirectorySeparatorIndex + 1), format);
                }

                if (pathComponents === UriComponents.Directory) {
                    return dirname;
                }

                if (!parts) {
                    parts = [];
                }

                parts.push(dirname);
            }

            var fileComponents = pathComponents & UriComponents.Filename;
            if (fileComponents && lastDirectorySeparatorIndex < (pathname.length - 1)) {
                var filename: string;
                if (lastDirectorySeparatorIndex > -1) {
                    filename = pathname.substr(lastDirectorySeparatorIndex + 1);
                } else {
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
                } else {
                    var lastExtensionSeparatorIndex = filename.lastIndexOf(Uri.EXTENSION_DELIMITER);
                    if (fileComponents === UriComponents.FilenameWithoutExtension) {
                        var filenameWithoutExtension: string;
                        if (lastExtensionSeparatorIndex === -1) {
                            filenameWithoutExtension = Uri.formatPath(filename, format);
                        } else if (lastExtensionSeparatorIndex > 0) {
                            filenameWithoutExtension = Uri.formatPath(filename.substr(0, lastExtensionSeparatorIndex), format);
                        } else {
                            filenameWithoutExtension = "";
                        }

                        if (pathComponents === UriComponents.FilenameWithoutExtension) {
                            return filenameWithoutExtension;
                        }

                        if (!parts) {
                            parts = [];
                        }

                        parts.push(filenameWithoutExtension);
                    } else {
                        var extension: string;
                        if (lastExtensionSeparatorIndex === 0) {
                            extension = Uri.formatPath(filename, format);
                        } else if (lastExtensionSeparatorIndex > 0) {
                            extension = Uri.formatPath(filename.substr(lastExtensionSeparatorIndex), format);
                        } else {
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
    }
}

export function create(text: string, kind?: UriKind): Uri
export function create(baseUri: Uri, relativeUri: string): Uri;
export function create(baseUri: Uri, relativeUri: Uri): Uri;
export function create(uri: any, kindOrRelativeUri?: any): Uri {
    return new Uri(uri, kindOrRelativeUri);
}
