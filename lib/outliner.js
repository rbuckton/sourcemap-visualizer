/// <reference path="node.d.ts" />
var fs = require('fs');
var path = require('path');
var file = require('./file');
var textwriter = require('./textwriter');
var decoder = require('./decoder');
function outline(outFile, generatedFile, mapFile, sourceMap) {
    var pathRoot = path.dirname(path.resolve(mapFile));
    if (sourceMap.sourceRoot) {
        pathRoot = path.resolve(pathRoot, sourceMap.sourceRoot);
    }
    var lineMappings = decoder.decode(sourceMap);
    var scopes = decoder.decodeScopes(sourceMap);
    var generatedText = file.readFile(generatedFile);
    var generatedLines = generatedText.split(/\r\n|\r|\n/g);
    var generatedLineCount = generatedLines.length;
    var generatedPadSize = generatedLines.length.toString().length;
    var sourceLineCounts = [];
    var generatedLineColors;
    var nextMappingId;
    return outlineWorker();
    function outlineWorker() {
        computeGeneratedLineColors();
        var writer = textwriter.create();
        writer.pipeTo(writeDocument);
        fs.writeFileSync(outFile, writer.toString(), "utf8");
    }
    function computeGeneratedLineColors() {
        generatedLineColors = [];
        var nextGeneratedLineColor = 0;
        var lastGeneratedLine = -1;
        for (var i = 0; i < lineMappings.length; i++) {
            if (lineMappings[i].generatedLine !== lastGeneratedLine) {
                lastGeneratedLine = lineMappings[i].generatedLine;
                generatedLineColors[lastGeneratedLine] = nextGeneratedLineColor++ % 6;
            }
        }
    }
    function writeDocument(writer) {
        writer.writeln('<!DOCTYPE html>').writeln('<html>').indent().pipeTo(writeHeader).pipeTo(writeBody).dedent().writeln('</html>');
    }
    function writeHeader(writer) {
        var stylePath = path.resolve(__dirname, "../res/runtime.css");
        writer.writeln('<head>').indent().writeln('<style>').suspendIndenting().writeln(file.readFile(stylePath)).resumeIndenting().writeln('</style>').dedent().writeln('</head>');
    }
    function writeBody(writer) {
        var scriptPath = path.resolve(__dirname, "../bin/runtime.js");
        writer.writeln('<body>').indent().writeln('<div class="horizontal-panes container">').indent().writeln('<div class="vertical-panes">').indent().writeln('<div class="horizontal-panes">').indent().pipeTo(writeSourcePane).pipeTo(writeGeneratedPane).dedent().writeln('</div>').pipeTo(writeMapPane).pipeTo(writeRawMapPane).dedent().writeln('</div>').dedent().writeln('</div>').writeln('<script>').suspendIndenting().writeln('var lineMappings = ${lineMappings};', { lineMappings: JSON.stringify(lineMappings) }).writeln('var generatedLineCount = ${generatedLineCount};', { generatedLineCount: JSON.stringify(generatedLineCount) }).writeln('var sourceLineCounts = ${sourceLineCounts};', { sourceLineCounts: JSON.stringify(sourceLineCounts) }).writeln(file.readFile(scriptPath)).resumeIndenting().writeln('</script>').dedent().writeln('</body>');
    }
    function writeSourcePane(writer) {
        writer.writeln('<div class="source-pane">').indent().pipeTo(writeSourceName).writeln('<div class="source-box">').indent().pipeEach(sourceMap.sources, writeSource).dedent().writeln('</div>').dedent().writeln('</div>');
    }
    function writeSourceName(writer) {
        writer.writeln('<div class="source-name">').indent().writeln('<select id="source">').indent().pipeEach(sourceMap.sources, writeSourceOption).dedent().writeln('</select>').dedent().writeln('</div>');
    }
    function writeSourceOption(writer, source, sourceIndex) {
        var sourcePath = path.resolve(pathRoot, source);
        writer.writeln('<option value="${sourceIndex}">${source}</option>', { sourceIndex: sourceIndex, source: sourcePath });
    }
    function writeSource(writer, source, sourceIndex) {
        var sourcePath = path.resolve(pathRoot, source);
        var sourceText = file.readFile(sourcePath);
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
                    writer.write('<span data-mapping="');
                    var color = "";
                    for (var i = 0; i < lastMappings.length; i++) {
                        var mapping = lastMappings[i];
                        if (i > 0) {
                            writer.write(' ');
                        }
                        writer.write('${id}', { id: mapping.id });
                        if ("sourceIndex" in mapping) {
                            color = getLineColorClass(mapping);
                        }
                    }
                    writer.write('" class="mapping ${color}">', { color: color });
                }
                else {
                    writer.write('<span class="text">');
                }
                writer.write(encode(sourceLineText.substring(lastSourceColumn, sourceColumn)));
                writer.write('</span>');
            }
        }
    }
    function writeGeneratedPane(writer) {
        writer.writeln('<div class="generated-pane">').indent().pipeTo(writeGeneratedName).writeln('<div class="generated-box">').indent().pipeTo(writeGenerated).dedent().writeln('</div>').dedent().writeln('</div>');
    }
    function writeGeneratedName(writer) {
        writer.writeln('<div class="generated-name">${generatedFile}</div>', { generatedFile: generatedFile });
    }
    function writeGenerated(writer) {
        writer.write('<div class="generated">').suspendIndenting().pipeEach(generatedLines, writeGeneratedLine).resumeIndenting().writeln('</div>');
    }
    function writeGeneratedLine(writer, generatedLineText, generatedLine) {
        writer.write('<span class="linenum">${line}: </span>', { line: pad(String(generatedLine + 1), generatedPadSize) });
        var mappingsForLine = lineMappings.filter(function (mapping) { return mapping.generatedLine === generatedLine; });
        var lastMapping = undefined;
        var lastGeneratedColumn = 0;
        for (var generatedColumn = 0; generatedColumn < generatedLineText.length; generatedColumn++) {
            var mappingForGeneratedColumn = mappingsForLine.filter(function (mapping) { return mapping.generatedColumn === generatedColumn; })[0];
            if (mappingForGeneratedColumn) {
                writePendingContent();
                lastMapping = mappingForGeneratedColumn;
                lastGeneratedColumn = generatedColumn;
            }
        }
        lastMapping = undefined;
        writePendingContent();
        writer.writeln();
        function writePendingContent() {
            if (generatedColumn > lastGeneratedColumn) {
                if (lastMapping) {
                    writer.write('<span data-source="${sourceIndex}" data-mapping="${id}" class="mapping ${color}">', {
                        sourceIndex: lastMapping.sourceIndex,
                        id: lastMapping.id,
                        color: getLineColorClass(lastMapping)
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
    function writeMapPane(writer) {
        writer.writeln("<div class='map-pane'>").indent().pipeTo(writeMapName).writeln('<div class="map-box">').indent().pipeTo(writeMap).dedent().writeln('</div>').dedent().writeln('</div>');
    }
    function writeMapName(writer) {
        writer.writeln("<div class='map-name'>${mapFile} [offsets]</div>", { mapFile: mapFile });
    }
    function writeMap(writer) {
        var mappingsPerLine = generatedLines.map(function (_, generatedLine) { return ({
            generatedLine: generatedLine,
            mappings: lineMappings.filter(function (mapping) { return mapping.generatedLine === generatedLine; }).sort(function (a, b) { return a.generatedColumn - b.generatedColumn; })
        }); });
        writer.writeln('<div class="map">').indent().pipeEach(mappingsPerLine, writeMapLine).dedent().writeln('</div>');
    }
    function writeMapLine(writer, mappingsForLine) {
        writer.write('<div class="line">').write('<span class="linenum">${line}: </span>', { line: pad(String(mappingsForLine.generatedLine + 1), generatedPadSize) }).pipeEach(mappingsForLine.mappings, writeLineMapping).writeln('</div>');
    }
    function writeLineMapping(writer, lineMapping) {
        if ("sourceIndex" in lineMapping) {
            writer.write('<span data-mapping="${id}" class="mapping ${color}">${generatedColumn}->${sourceIndex}:${sourceLine},${sourceColumn}</span>', {
                sourceIndex: lineMapping.sourceIndex,
                id: lineMapping.id,
                generatedColumn: lineMapping.generatedColumn + 1,
                sourceLine: lineMapping.sourceLine + 1,
                sourceColumn: lineMapping.sourceColumn + 1,
                color: getLineColorClass(lineMapping)
            });
        }
        else {
            writer.write('<span data-mapping="${id}" class="mapping ${color}">${generatedColumn}</span>', {
                sourceIndex: lineMapping.sourceIndex,
                id: lineMapping.id,
                generatedColumn: lineMapping.generatedColumn + 1,
                color: getLineColorClass(lineMapping)
            });
        }
    }
    function writeRawMapPane(writer) {
        writer.writeln('<div class="rawmap-pane">').indent().pipeTo(writeRawMapName).writeln('<div class="rawmap-box">').indent().pipeTo(writeRawMap).dedent().writeln('</div>').dedent().writeln('</div>');
    }
    function writeRawMapName(writer) {
        writer.writeln("<div class='rawmap-name'>${mapFile} [raw]</div>", { mapFile: mapFile });
    }
    function writeRawMap(writer) {
        var jsonwriter = textwriter.create();
        jsonwriter.pipeTo(writeRawMapJson);
        writer.write('<div class="rawmap">').suspendIndenting().write(jsonwriter.toString()).resumeIndenting().writeln('</div>');
    }
    function writeRawMapJson(writer) {
        writer.writeln('{').indent().pipeEach(entries(sourceMap), writeRawMapJsonPair, writeJsonComma).writeln('').dedent().write('}');
    }
    function writeJsonComma(writer) {
        writer.writeln(",");
    }
    function writeRawMapJsonPair(writer, pair) {
        var key = pair[0];
        var value = pair[1];
        writer.write('"${name}": ', { name: encode(key) });
        if (key === "sources") {
            writer.pipeTo(writeRawMapJsonSources);
        }
        else if (key === "mappings") {
            writer.pipeTo(writeRawMapJsonMappings);
        }
        else {
            writer.write(JSON.stringify(value, undefined, "  "));
        }
    }
    function writeRawMapJsonSources(writer) {
        writer.writeln('[').indent().pipeEach(sourceMap.sources, writeRawMapJsonSource).dedent().write(']');
    }
    function writeRawMapJsonSource(writer, source, sourceIndex) {
        writer.writeln('<span class="rawsource" data-source="${sourceIndex}">"${source}"</span>', { sourceIndex: sourceIndex, source: encode(source) });
    }
    function writeRawMapJsonMappings(writer) {
        nextMappingId = 0;
        writer.write('"').pipeEach(sourceMap.mappings.split(";"), writeRawMapJsonMappingLine, ";").write('"');
    }
    function writeRawMapJsonMappingLine(writer, mappingLine) {
        if (mappingLine) {
            writer.pipeEach(mappingLine.split(","), writeRawMapJsonMappingSegment, ",");
        }
    }
    function writeRawMapJsonMappingSegment(writer, segment) {
        if (segment) {
            var mapping = lineMappings[nextMappingId++];
            writer.write('<span data-mapping="${id}" class="mapping ${color}">${text}</span>', {
                id: mapping.id,
                text: encode(segment),
                color: getLineColorClass(mapping),
            });
        }
    }
    function pad(text, size) {
        var len = size - (text ? text.length : 0);
        return Array(len + 1).join(" ") + (text || "");
    }
    function encode(text) {
        return text.replace(/&(?!.{1,6};)/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }
    function entries(obj) {
        var entries = [];
        for (var p in obj) {
            entries.push([p, obj[p]]);
        }
        return entries;
    }
    function getLineColorClass(mapping) {
        if ("sourceIndex" in mapping) {
            var color = generatedLineColors[mapping.generatedLine] % 6;
            return "linecolor" + color;
        }
        else {
            return "gap";
        }
        return "";
    }
}
exports.outline = outline;
//# sourceMappingURL=D:/Workspaces/SourceMaps/lib/outliner.js.map