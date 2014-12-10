/// <reference path="node.d.ts" />
var fs = require('fs');
var url = require('url');
var path = require('path');
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
function readFile(fileName, encoding) {
    var buffer = fs.readFileSync(fileName);
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
function resolvePath(pathOrUri, from) {
    if (pathOrUri) {
        if (/^file:\/\/\//.test(pathOrUri)) {
            pathOrUri = url.parse(pathOrUri).path;
        }
        if (from) {
            return path.resolve(from, pathOrUri);
        }
    }
    return pathOrUri;
}
exports.resolvePath = resolvePath;
//# sourceMappingURL=file.js.map