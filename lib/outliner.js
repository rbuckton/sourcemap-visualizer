/// <reference path="node.d.ts" />
var fs = require('fs');
var path = require('path');
var utils = require('./utils');
var textwriter = require('./textwriter');
var decoder = require('./decoder');
function outline(mapFile, outFile) {
    var parsedSourceMap = decoder.decode(mapFile);
    var generatedContent = parsedSourceMap.getGeneratedFileContent();
    if (!generatedContent)
        return;
    var generatedLines = generatedContent.split(/\r\n|\r|\n/g);
    var generatedLineCount = generatedLines.length;
    var generatedPadSize = generatedLines.length.toString().length;
    var generatedLineColors;
    var sourceLineCounts = [];
    var nextMappingIndex = 0;
    return outlineWorker();
    function outlineWorker() {
        computeLineColors();
        var writer = textwriter.create();
        writer.pipeTo(writeDocument);
        fs.writeFileSync(outFile, writer.toString(), "utf8");
    }
    function computeLineColors() {
        generatedLineColors = [];
        var mappings = parsedSourceMap.getMappings();
        var nextGeneratedLineColor = 0;
        var lastGeneratedLine = -1;
        for (var i = 0; i < mappings.length; i++) {
            if (mappings[i].generatedLine !== lastGeneratedLine) {
                lastGeneratedLine = mappings[i].generatedLine;
                generatedLineColors[lastGeneratedLine] = nextGeneratedLineColor++ % 6;
            }
        }
    }
    function writeDocument(writer) {
        writer.writeln('<!DOCTYPE html>').writeln('<html>').indent().pipeTo(writeHeader).pipeTo(writeBody).dedent().writeln('</html>');
    }
    function writeHeader(writer) {
        var stylePath = path.resolve(__dirname, "../res/runtime.css");
        writer.writeln('<head>').indent().writeln('<style>').suspendIndenting().writeln(utils.readFile(stylePath)).resumeIndenting().writeln('</style>').dedent().writeln('</head>');
    }
    function writeBody(writer) {
        var scriptPath = path.resolve(__dirname, "../bin/runtime.js");
        writer.writeln('<body>').indent().writeln('<div class="horizontal-panes container">').indent().writeln('<div class="vertical-panes">').indent().writeln('<div class="horizontal-panes">').indent().pipeTo(writeSourcePane).pipeTo(writeGeneratedPane).dedent().writeln('</div>').pipeTo(writeMapPane).pipeTo(writeRawMapPane).dedent().writeln('</div>').dedent().writeln('</div>').writeln('<script>').suspendIndenting().writeln('var lineMappings = ${lineMappings};', { lineMappings: JSON.stringify(parsedSourceMap.getMappings(), undefined, "  ") }).writeln('var generatedLineCount = ${generatedLineCount};', { generatedLineCount: JSON.stringify(generatedLineCount, undefined, "  ") }).writeln('var sourceLineCounts = ${sourceLineCounts};', { sourceLineCounts: JSON.stringify(sourceLineCounts, undefined, "  ") }).writeln(utils.readFile(scriptPath)).resumeIndenting().writeln('</script>').dedent().writeln('</body>');
    }
    function writeSourcePane(writer) {
        writer.writeln('<div class="source-pane">').indent().pipeTo(writeSourceNames).writeln('<div class="source-box">').indent().pipeEach(parsedSourceMap.getSources(), writeSource).dedent().writeln('</div>').dedent().writeln('</div>');
    }
    function writeSourceNames(writer) {
        writer.writeln('<div class="source-name">').indent().writeln('<select id="source">').indent().pipeEach(parsedSourceMap.getSources(), writeSourceNamesOption).dedent().writeln('</select>').dedent().writeln('</div>');
    }
    function writeSourceNamesOption(writer, source) {
        var sourcePath = source.url;
        var sourceIndex = source.sourceIndex;
        writer.writeln('<option value="${sourceIndex}">${sourcePath}</option>', { sourceIndex: sourceIndex, sourcePath: sourcePath });
    }
    function writeSource(writer, source) {
        var sourcePath = source.url;
        var sourceIndex = source.sourceIndex;
        var sourceContent = parsedSourceMap.getSourceContent(sourceIndex) || "";
        var sourceLines = sourceContent.split(/\r\n|\r|\n/g);
        var lastSourceColumn = 0;
        var sourceLineContent;
        var lastMappings;
        sourceLineCounts[sourceIndex] = sourceLines.length;
        var padSize = sourceLines.length.toString().length;
        writer.write('<div class="source" data-source="${sourceIndex}">', { sourceIndex: sourceIndex }).suspendIndenting();
        for (var sourceLine = 0; sourceLine < sourceLines.length; sourceLine++) {
            writer.write("<span class='linenum'>${line}: </span>", { line: pad((sourceLine + 1).toString(), padSize) });
            var sourceLineContent = sourceLines[sourceLine];
            for (var sourceColumn = 0; sourceColumn < sourceLineContent.length; sourceColumn++) {
                var mappings = parsedSourceMap.getCandidateMappingsAtSourceLocation(source.sourceIndex, sourceLine, sourceColumn);
                if (mappings.length) {
                    writePendingContent();
                    lastMappings = mappings;
                    lastSourceColumn = sourceColumn;
                }
            }
            writePendingContent();
            writer.writeln();
            lastMappings = undefined;
            lastSourceColumn = 0;
        }
        writer.resumeIndenting().writeln('</div>');
        function writePendingContent() {
            if (sourceColumn > lastSourceColumn) {
                if (lastMappings) {
                    var color = "";
                    for (var i = lastMappings.length - 1; i >= 0; i--) {
                        if (lastMappings[i].source) {
                            color = getLineColorClass(lastMappings[i]);
                            break;
                        }
                    }
                    writer.write('<span data-mapping="').pipeEach(lastMappings, writeMappingIndex, ' ').write('" class="mapping ${color}">', { color: color });
                }
                else {
                    writer.write('<span class="text">');
                }
                writer.write(encode(sourceLineContent.substring(lastSourceColumn, sourceColumn)));
                writer.write('</span>');
            }
        }
    }
    function writeMappingIndex(writer, mapping) {
        writer.write(String(mapping.mappingIndex));
    }
    function writeGeneratedPane(writer) {
        writer.writeln('<div class="generated-pane">').indent().pipeTo(writeGeneratedName).writeln('<div class="generated-box">').indent().pipeTo(writeGenerated).dedent().writeln('</div>').dedent().writeln('</div>');
    }
    function writeGeneratedName(writer) {
        writer.writeln('<div class="generated-name">${generatedFile}</div>', { generatedFile: parsedSourceMap.generatedFile });
    }
    function writeGenerated(writer) {
        writer.write('<div class="generated">').suspendIndenting().pipeEach(generatedLines, writeGeneratedLine).resumeIndenting().writeln('</div>');
    }
    function writeGeneratedLine(writer, generatedLineText, generatedLine) {
        writer.write('<span class="linenum">${line}: </span>', { line: pad(String(generatedLine + 1), generatedPadSize) });
        var lastMapping = undefined;
        var lastGeneratedColumn = 0;
        for (var generatedColumn = 0; generatedColumn < generatedLineText.length; generatedColumn++) {
            var mappingForGeneratedColumn = parsedSourceMap.getMappingAtGeneratedLocation(generatedLine, generatedColumn);
            if (mappingForGeneratedColumn) {
                writePendingContent();
                lastMapping = mappingForGeneratedColumn;
                lastGeneratedColumn = generatedColumn;
            }
        }
        writePendingContent();
        writer.writeln();
        function writePendingContent() {
            if (generatedColumn > lastGeneratedColumn) {
                if (lastMapping) {
                    writer.write('<span data-mapping="${id}" class="mapping ${color}">', {
                        id: lastMapping.mappingIndex,
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
        writer.writeln('<div class="map">').indent().pipeEach(generatedLines, writeMapLine).dedent().writeln('</div>');
    }
    function writeMapLine(writer, generatedLineContent, generatedLine) {
        var mappings = parsedSourceMap.getMappingsAtGeneratedLine(generatedLine);
        writer.write('<div class="line">').write('<span class="linenum">${line}: </span>', { line: pad(String(generatedLine + 1), generatedPadSize) }).pipeEach(mappings, writeLineMapping).writeln('</div>');
    }
    function writeLineMapping(writer, mapping) {
        if (mapping.source) {
            writer.write('<span data-mapping="${id}" class="mapping ${color}">${generatedColumn}->${sourceIndex}:${sourceLine},${sourceColumn}</span>', {
                sourceIndex: mapping.source.sourceIndex,
                id: mapping.mappingIndex,
                generatedColumn: mapping.generatedColumn + 1,
                sourceLine: mapping.sourceLine + 1,
                sourceColumn: mapping.sourceColumn + 1,
                color: getLineColorClass(mapping)
            });
        }
        else {
            writer.write('<span data-mapping="${id}" class="mapping ${color}">${generatedColumn}</span>', {
                id: mapping.mappingIndex,
                generatedColumn: mapping.generatedColumn + 1,
                color: getLineColorClass(mapping)
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
        if (parsedSourceMap.isIndexMap) {
            writeRawIndexMapJson(writer);
        }
        else {
            writeRawSourceMapJson(writer, parsedSourceMap.getSourceMap(0));
        }
    }
    function writeRawIndexMapJson(writer) {
    }
    function writeRawSourceMapJson(writer, sourceMap) {
        writer.writeln('{').indent().pipeEach(entries(sourceMap), writeRawMapJsonPair, writeJsonComma).writeln('').dedent().write('}');
    }
    function writeJsonComma(writer) {
        writer.writeln(",");
    }
    function writeLeadingOrTrailingNewline(writer) {
        writer.writeln();
    }
    function writeRawMapJsonPair(writer, pair) {
        var key = pair[0];
        var value = pair[1];
        var obj = pair[2];
        writer.write('"${name}": ', { name: encode(key) });
        if (key === "sources") {
            writer.pipeTo(writeRawMapJsonSources, obj);
        }
        else if (key === "mappings") {
            writer.pipeTo(writeRawMapJsonMappings, obj);
        }
        else if (key === "sections") {
            writer.pipeTo(writeRawMapJsonSections, obj);
        }
        else {
            writer.write(JSON.stringify(value, undefined, "  "));
        }
    }
    function writeRawMapJsonSections(writer, indexMap) {
    }
    function writeRawMapJsonSources(writer, sourceMap) {
        writer.write('[').indent().pipeEach(sourceMap.sources, writeRawMapJsonSource, writeJsonComma, writeLeadingOrTrailingNewline, writeLeadingOrTrailingNewline).dedent().write(']');
    }
    function writeRawMapJsonSource(writer, source, sourceIndex) {
        writer.write('<span class="rawsource" data-source="${sourceIndex}">"${source}"</span>', { sourceIndex: sourceIndex, source: encode(source) });
    }
    function writeRawMapJsonMappings(writer, sourceMap) {
        writer.write('"').pipeEach(sourceMap.mappings.split(";"), writeRawMapJsonMappingLine, ";").write('"');
    }
    function writeRawMapJsonMappingLine(writer, mappingLine) {
        if (mappingLine) {
            writer.pipeEach(mappingLine.split(","), writeRawMapJsonMappingSegment, ",");
        }
    }
    function writeRawMapJsonMappingSegment(writer, segment) {
        if (segment) {
            var mapping = parsedSourceMap.getMapping(nextMappingIndex++);
            writer.write('<span data-mapping="${id}" class="mapping ${color}">${text}</span>', {
                id: mapping.mappingIndex,
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
            entries.push([p, obj[p], obj]);
        }
        return entries;
    }
    function getLineColorClass(mapping) {
        if (mapping.source) {
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
//# sourceMappingURL=outliner.js.map