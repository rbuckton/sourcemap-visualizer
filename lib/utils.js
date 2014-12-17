/// <reference path="node.d.ts" />
var fs = require('fs');
var url = require('url');
var path = require('path');
var os = require('os');
require('source-map-support').install();
function getEncoding(buffer) {
    if (buffer.length >= 2) {
        var bom0 = buffer[0];
        var bom1 = buffer[1];
        if (bom0 === 0xfe && bom1 === 0xff) {
            return "utf16be";
        }
        else if (bom0 === 0xff && bom1 === 0xfe) {
            return "utf16le";
        }
        else if (buffer.length >= 3 && bom0 === 0xef && bom1 === 0xbb && buffer[2] === 0xbf) {
            return "utf8";
        }
    }
    return "";
}
function readFile(path, encoding) {
    if (isUrl(path)) {
        var parsedUrl = url.parse(path);
        if (parsedUrl.protocol === 'file:') {
            path = parsedUrl.path;
            if (os.platform() === 'win32') {
                if (parsedUrl.hostname) {
                    path = '//' + parsedUrl.hostname + path;
                }
                else {
                    path = path.substr(1);
                }
            }
        }
        else {
            return;
        }
    }
    var buffer = fs.readFileSync(path);
    var encoding = getEncoding(buffer);
    switch (encoding) {
        case "utf16be":
            for (var i = 0; i < buffer.length; i += 2) {
                var b = buffer[i];
                buffer[i] = buffer[i + 1];
                buffer[i + 1] = b;
            }
        case "utf16le":
            return buffer.toString("utf16le", 2);
        case "utf8":
            return buffer.toString("utf8", 3);
        default:
            return buffer.toString("utf8");
    }
}
exports.readFile = readFile;
function resolve(from, to) {
    if (isRooted(to)) {
        return to;
    }
    if (isUrl(from)) {
        return url.resolve(from, to);
    }
    else if (isRooted(from)) {
        return path.resolve(from, to);
    }
    else if (!/[\\/]$/.test(from)) {
        from += '/';
    }
    return from + to;
}
exports.resolve = resolve;
function absolute(url) {
    if (isRooted(url)) {
        return url;
    }
    return path.resolve(url);
}
exports.absolute = absolute;
function isUrl(url) {
    return /^[\w\d-_]+:[\\/]{2}/.test(url);
}
exports.isUrl = isUrl;
function isFileUrl(url) {
    return /^file:\/{2}/.test(url);
}
exports.isFileUrl = isFileUrl;
function isRooted(path) {
    return isUrl(path) || /^[\\/]/.test(path) || (/^win/.test(os.platform()) && /^[a-z]:[\\/]/i.test(path));
}
exports.isRooted = isRooted;
//# sourceMappingURL=utils.js.map