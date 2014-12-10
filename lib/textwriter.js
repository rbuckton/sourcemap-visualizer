/// <reference path="node.d.ts" />
var os = require('os');
function create(text) {
    var builder = [];
    var length = 0;
    var indent = 0;
    var newlineRequested = false;
    var indentingSuspended = 0;
    if (text) {
        builder.push(text);
    }
    return {
        get length() {
            return length;
        },
        indent: function () {
            indent++;
            return this;
        },
        dedent: function () {
            indent = Math.max(0, indent - 1);
            return this;
        },
        suspendIndenting: function () {
            indentingSuspended++;
            return this;
        },
        resumeIndenting: function () {
            indentingSuspended--;
            return this;
        },
        write: function (text, params) {
            write(text, params);
            return this;
        },
        writeln: function (text, params) {
            if (text) {
                write(text, params);
            }
            else if (newlineRequested) {
                builder.push(os.EOL);
                length += os.EOL.length;
            }
            newlineRequested = true;
            return this;
        },
        pipeTo: function (callback) {
            var args = [];
            for (var _i = 1; _i < arguments.length; _i++) {
                args[_i - 1] = arguments[_i];
            }
            args.unshift(this);
            callback.apply(undefined, args);
            return this;
        },
        pipeEach: pipeEach,
        clear: function () {
            builder.length = 0;
            length = 0;
            return this;
        },
        toString: function () {
            var text = builder.join("");
            if (newlineRequested) {
                text += os.EOL;
            }
            return text;
        }
    };
    function write(text, params) {
        if (text) {
            var lines = text.split(/\r\n|\r|\n/g);
            lines.forEach(function (line, index) {
                if (index > 0) {
                    newlineRequested = true;
                }
                if (newlineRequested) {
                    newlineRequested = false;
                    builder.push(os.EOL);
                    length += os.EOL.length;
                    if (!indentingSuspended && indent) {
                        builder.push(Array(indent + 1).join("  "));
                        length += indent * 2;
                    }
                }
                if (params) {
                    line = line.replace(/\${([\w$_-]+)}/ig, function (_, key) { return typeof params[key] === "undefined" ? "" : params[key]; });
                }
                builder.push(line);
                length += line.length;
            });
        }
    }
    function pipeEach(elements, callback, separator) {
        for (var i = 0; i < elements.length; i++) {
            if (i > 0) {
                if (typeof separator === "function") {
                    separator(this);
                }
                else if (typeof separator === "string") {
                    write(separator);
                }
            }
            callback(this, elements[i], i);
        }
        return this;
    }
}
exports.create = create;
//# sourceMappingURL=textwriter.js.map