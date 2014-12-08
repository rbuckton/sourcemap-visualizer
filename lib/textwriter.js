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
    function write(text, params) {
        if (text) {
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
                text = text.replace(/\${([\w$_-]+)}/ig, function (_, key) { return typeof params[key] === "undefined" ? "" : params[key]; });
            }
            builder.push(text);
            length += text.length;
        }
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
            callback(this);
            return this;
        },
        pipeEach: function (elements, callback) {
            for (var i = 0; i < elements.length; i++) {
                callback(this, elements[i], i);
            }
            return this;
        },
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
}
exports.create = create;
//# sourceMappingURL=F:/Workspaces/SourceMaps/lib/textwriter.js.map