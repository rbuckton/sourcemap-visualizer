var fs = require('fs');
var file = require('./file');
var uri = require('./uri');
var textwriter = require('./textwriter');
var decoder = require('./decoder');
var moduleUri = uri.create(module.filename);
(function (OutlineKind) {
    OutlineKind[OutlineKind["Mappings"] = 0] = "Mappings";
    OutlineKind[OutlineKind["Scopes"] = 1] = "Scopes";
})(exports.OutlineKind || (exports.OutlineKind = {}));
var OutlineKind = exports.OutlineKind;
function outline(outFile, generatedFile, mapFile, sourceMap, kind) {
    if (kind === void 0) { kind = 0 /* Mappings */; }
    var rootUri = uri.create(process.cwd() + "/");
    rootUri = uri.create(rootUri, mapFile);
    if (sourceMap.sourceRoot) {
        rootUri = uri.create(rootUri, sourceMap.sourceRoot);
    }
    var lineMappings = decoder.decode(sourceMap);
    var scopes = decoder.decodeScopes(sourceMap);
    var generatedText = file.readFile(generatedFile);
    var generatedLines = generatedText.split(/\r\n|\r|\n/g);
    var generatedLineCount = generatedLines.length;
    var generatedPadSize = generatedLines.length.toString().length;
    var sourceLineCounts = [];
    if (scopes) {
        var scopesByStartLine = new Map();
        var scopesByEndLine = new Map();
        scopes.forEach(function (scope) {
            var scopesByStartLineStartColumn = scopesByStartLine.get(scope.startLine);
            if (!scopesByStartLineStartColumn) {
                scopesByStartLineStartColumn = new Map();
                scopesByStartLine.set(scope.startLine, scopesByStartLineStartColumn);
            }
            scopesByStartLineStartColumn.set(scope.startColumn, scope);
            var scopesByEndLineEndColumn = scopesByEndLine.get(scope.endLine);
            if (!scopesByEndLineEndColumn) {
                scopesByEndLineEndColumn = new Map();
                scopesByEndLine.set(scope.endLine, scopesByEndLineEndColumn);
            }
            scopesByEndLineEndColumn.set(scope.endColumn, scope);
        });
    }
    var writer = textwriter.create();
    writer.pipeTo(writeDocument);
    fs.writeFileSync(outFile, writer.toString(), "utf8");
    function writeDocument(writer) {
        writer.writeln('<!DOCTYPE html>').writeln('<html>').indent().pipeTo(writeHeader).pipeTo(writeBody).dedent().writeln('</html>');
    }
    function writeHeader(writer) {
        var styleUri = uri.create(moduleUri, '../res/runtime.css');
        writer.writeln('<head>').indent().writeln('<style>').writeln(file.readFile(styleUri.localPath)).writeln('</style>').dedent().writeln('</head>');
    }
    function writeBody(writer) {
        var scriptUri = uri.create(moduleUri, '../bin/runtime.js');
        writer.writeln('<body>').indent().writeln('<div class="horizontal-panes container">').indent().writeln('<div class="vertical-panes">').indent().writeln('<div class="horizontal-panes">').indent().pipeTo(writeSourcePane).pipeTo(writeGeneratedPane).dedent().writeln('</div>').pipeTo(writeMapPane).dedent().writeln('</div>').dedent().writeln('</div>').writeln('<script>').indent().writeln('var lineMappings = ${lineMappings};', { lineMappings: JSON.stringify(lineMappings) }).writeln('var generatedLineCount = ${generatedLineCount};', { generatedLineCount: JSON.stringify(generatedLineCount) }).writeln('var sourceLineCounts = ${sourceLineCounts};', { sourceLineCounts: JSON.stringify(sourceLineCounts) }).writeln(file.readFile(scriptUri.localPath)).dedent().writeln('</script>').dedent().writeln('</body>');
    }
    function writeSourcePane(writer) {
        writer.writeln('<div class="source-pane">').indent().pipeTo(writeSourceName).writeln('<div class="source-box">').indent().pipeEach(sourceMap.sources, writeSource).dedent().writeln('</div>').dedent().writeln('</div>');
    }
    function writeSourceName(writer) {
        writer.writeln('<div class="source-name">').indent().writeln('<select id="source">').indent().pipeEach(sourceMap.sources, writeSourceOption).dedent().writeln('</select>').dedent().writeln('</div>');
    }
    function writeSourceOption(writer, source, sourceIndex) {
        var sourceUri = uri.create(rootUri, source);
        writer.writeln('<option value="${sourceIndex}">${source}</option>', { sourceIndex: sourceIndex, source: sourceUri.toString() });
    }
    function writeSource(writer, source, sourceIndex) {
        var sourceUri = uri.create(rootUri, source);
        var sourceText = file.readFile(sourceUri.localPath);
        var sourceLines = sourceText.split(/\r\n|\r|\n/g);
        var sourceLineText = sourceLines[sourceLine];
        var lastLineMapping;
        sourceLineCounts[sourceIndex] = sourceLines.length;
        var padSize = sourceLines.length.toString().length;
        var mappingsForSource = lineMappings.filter(function (lineMapping) { return lineMapping.sourceIndex === sourceIndex; });
        mappingsForSource.sort(function (left, right) { return (left.sourceLine - right.sourceLine) || (left.sourceColumn - right.sourceColumn); });
        writer.write('<div class="source" data-source="${sourceIndex}">', { sourceIndex: sourceIndex }).suspendIndenting();
        for (var sourceLine = 0; sourceLine < sourceLines.length; sourceLine++) {
            writer.write("<span class='linenum'>${line}: </span>", { line: pad((sourceLine + 1).toString(), padSize) });
            var lastSourceColumn = 0;
            var lastMappings = undefined;
            var sourceLineText = sourceLines[sourceLine];
            var mappingsForSourceLine = mappingsForSource.filter(function (mapping) { return mapping.sourceLine === sourceLine; });
            for (var sourceColumn = 0; sourceColumn < sourceLineText.length; sourceColumn++) {
                var mappingsForSourceColumn = mappingsForSourceLine.filter(function (mapping) { return mapping.sourceColumn === sourceColumn; });
                if (mappingsForSourceColumn.length) {
                    writePendingContent();
                    lastMappings = mappingsForSourceColumn;
                    lastSourceColumn = sourceColumn;
                }
            }
            writePendingContent();
            writer.writeln();
        }
        writer.resumeIndenting().writeln('</div>');
        function writePendingContent() {
            if (sourceColumn > lastSourceColumn) {
                if (lastMappings) {
                    for (var i = 0; i < lastMappings.length; i++) {
                        var mapping = lastMappings[i];
                        writer.write('<span data-source="${sourceIndex}" data-mapping="${id}" class="mapping linecolor${color}">', {
                            sourceIndex: mapping.sourceIndex,
                            id: mapping.id,
                            color: mapping.generatedLine % 6
                        });
                    }
                }
                else {
                    writer.write('<span class="text">');
                }
                writer.write(encode(sourceLineText.substring(lastSourceColumn, sourceColumn)));
                if (lastMappings) {
                    for (var i = 0; i < lastMappings.length; i++) {
                        writer.write('</span>');
                    }
                }
                else {
                    writer.write('</span>');
                }
            }
        }
    }
    function writeGeneratedPane(writer) {
        writer.writeln('<div class="generated-pane">').indent().pipeTo(writeGeneratedName).writeln('<div class="generated-box">').indent().pipeTo(writeGenerated).dedent().writeln('</div>').dedent().writeln('</div>');
    }
    function writeGeneratedName(writer) {
        writer.writeln('<div class="generated-name">${generatedFile}</div>', { generatedFile: uri.create(generatedFile).toString() });
    }
    function writeGenerated(writer) {
        writer.write('<div class="generated">').suspendIndenting();
        for (var generatedLine = 0; generatedLine < generatedLines.length; generatedLine++) {
            writer.write('<span class="linenum">${line}: </span>', { line: pad(String(generatedLine + 1), generatedPadSize) });
            var lastMapping = undefined;
            var lastGeneratedColumn = 0;
            var generatedLineText = generatedLines[generatedLine];
            var mappingsForLine = lineMappings.filter(function (mapping) { return mapping.generatedLine === generatedLine; });
            for (var generatedColumn = 0; generatedColumn < generatedLineText.length; generatedColumn++) {
                var mappingForGeneratedColumn = mappingsForLine.filter(function (mapping) { return mapping.generatedColumn === generatedColumn; })[0];
                if (mappingForGeneratedColumn) {
                    writePendingContent();
                    lastMapping = mappingForGeneratedColumn;
                    lastGeneratedColumn = generatedColumn;
                }
            }
            writePendingContent();
            writer.writeln();
        }
        writer.resumeIndenting().writeln('</div>');
        function writePendingContent() {
            if (generatedColumn > lastGeneratedColumn) {
                if (lastMapping) {
                    writer.write('<span data-source="${sourceIndex}" data-mapping="${id}" class="mapping linecolor${color}">', {
                        sourceIndex: lastMapping.sourceIndex,
                        id: lastMapping.id,
                        color: generatedLine % 6
                    });
                }
                else {
                    writer.write('<span class="text">');
                }
                // write any previous unmapped text
                writer.write(encode(generatedLineText.substring(lastGeneratedColumn, generatedColumn)));
                writer.write('</span>');
            }
        }
    }
    function writeGeneratedScopes(writer) {
        var scopeStack = [];
        var currentScope;
        writer.write('<div class="generated-scopes">').suspendIndenting();
        for (var generatedLine = 0; generatedLine < generatedLines.length; generatedLine++) {
            writer.write('<span class="linenum">${line}: </span>', { line: pad(String(generatedLine + 1), generatedPadSize) });
            writer.pipeEach(scopeStack, writeScopeSpanStart);
            var generatedLineText = generatedLines[generatedLine];
            var lastGeneratedColumn = 0;
            for (var generatedColumn = 0; generatedColumn < generatedLineText.length; generatedColumn++) {
                if (scopes) {
                    var scopesByStartLineStartColumn = scopesByStartLine.get(generatedLine);
                    if (scopesByStartLineStartColumn) {
                        var newScope = scopesByStartLineStartColumn.get(generatedColumn);
                        if (newScope) {
                            writePendingContent();
                            lastGeneratedColumn = generatedColumn;
                            writeScopeSpanStart(writer, newScope, scopeStack.length, true);
                            scopeStack.push(newScope);
                            currentScope = newScope;
                        }
                    }
                    else if (currentScope && currentScope.endLine === generatedLine && currentScope.endColumn === generatedColumn) {
                        writePendingContent();
                        lastGeneratedColumn = generatedColumn;
                        writeScopeSpanEnd(writer, currentScope, scopeStack.length, true);
                        currentScope = scopeStack.pop();
                    }
                }
            }
            writePendingContent();
            writer.pipeEach(scopeStack, writeScopeSpanEnd);
            writer.writeln();
        }
        writer.resumeIndenting().writeln('</div>');
        function writePendingContent() {
            if (generatedColumn > lastGeneratedColumn) {
                // write any previous unmapped text
                writer.write(encode(generatedLineText.substring(lastGeneratedColumn, generatedColumn)));
            }
        }
    }
    function writeScopeSpanStart(writer, scope, index, startScope) {
        writer.writeln('<span class="${class}" title="[${startLine}:${startColumn}::${endLine}:${endColumn}]', {
            class: startScope ? "start-scope" : "ambient-scope",
            startLine: scope.startLine + 1,
            startColumn: scope.startColumn + 1,
            endLine: scope.endLine + 1,
            endColumn: scope.endColumn + 1
        }).pipeEach(scope.locals, writeLocalTitleText).write('">');
    }
    function writeScopeSpanEnd(writer, scope, index, endScope) {
        if (endScope) {
            writer.write('<span class="end-scope"></span>');
        }
        writer.write('</span>');
    }
    function writeLocalTitleText(writer, local) {
        writer.writeln();
        if (local.isHidden) {
            writer.write('&lt;${generatedName}&gt;', { generatedName: local.generatedName });
        }
        else if (local.isRenamed) {
            writer.write('${generatedName} -&gt; ${sourceName}', { generatedName: local.generatedName, sourceName: local.sourceName });
        }
        else {
            writer.write(local.generatedName);
        }
    }
    function writeMapPane(writer) {
        writer.writeln("<div class='map-pane'>").indent().pipeTo(writeMapName).writeln('<div class="map-box">').indent().pipeTo(writeMap).dedent().writeln('</div>').dedent().writeln('</div>');
    }
    function writeMapName(writer) {
        writer.writeln("<div class='map-name'>${mapFile}</div>", { mapFile: uri.create(mapFile).toString() });
    }
    function writeMap(writer) {
        writer.writeln('<div class="map">').indent();
        for (var generatedLine = 0; generatedLine < generatedLines.length; generatedLine++) {
            writer.write('<div class="line">').write('<span class="linenum">${line}: </span>', { line: pad(String(generatedLine + 1), generatedPadSize) });
            var mappingsForLine = lineMappings.filter(function (mapping) { return mapping.generatedLine === generatedLine; });
            mappingsForLine.sort(function (a, b) { return a.generatedColumn - b.generatedColumn; });
            writer.pipeEach(mappingsForLine, writeLineMapping);
            writer.writeln('</div>');
        }
    }
    function writeLineMapping(writer, lineMapping) {
        writer.write('<span data-mapping="${id}" data-source="${sourceIndex}" class="mapping linecolor${color}">${generatedColumn}->${sourceIndex}:${sourceLine},${sourceColumn}</span>', {
            sourceIndex: lineMapping.sourceIndex,
            id: lineMapping.id,
            generatedColumn: lineMapping.generatedColumn,
            sourceLine: lineMapping.sourceLine,
            sourceColumn: lineMapping.sourceColumn,
            color: lineMapping.generatedLine % 6
        });
    }
    function pad(text, size) {
        var len = size - (text ? text.length : 0);
        return Array(len + 1).join(" ") + (text || "");
    }
    function encode(text) {
        return text.replace(/&(?!.{1,6};)/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }
}
exports.outline = outline;
//# sourceMappingURL=outliner.js.map