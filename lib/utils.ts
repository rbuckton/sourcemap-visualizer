/// <reference path="node.d.ts" />
import fs = require('fs');
import url = require('url');
import path = require('path');
import os = require('os');

function getEncoding(buffer: Buffer): string {
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

export function readFile(fileName: string, encoding?: string): string {
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

export function resolve(from: string, to: string) {
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

export function absolute(url: string) {
    if (isRooted(url)) {
        return url;
    }

    return path.resolve(url);
}

export function isUrl(url: string): boolean {
    return /^[\w\d-_]+:[\\/]{2}/.test(url);
}

export function isRooted(path: string): boolean {
    return isUrl(path)
        || /^[\\/]/.test(path)
        || (os.platform() === 'win32' && /^[a-z]:[\\/]/i.test(path));
}
