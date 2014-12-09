/// <reference path="node.d.ts" />
import fs = require('fs');
import path = require('path');
import file = require('./file');
import textwriter = require('./textwriter');
import decoder = require('./decoder');

import SourceMap = decoder.SourceMap;
import LineMapping = decoder.LineMapping;
import Scope = decoder.Scope;
import LocalMapping = decoder.Local;
import TextWriter = textwriter.TextWriter;

export function outline(outFile: string, generatedFile: string, mapFile: string, sourceMap: SourceMap): void {  
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
    var sourceLineCounts: number[] = [];
    var generatedLineColors: number[];
    var nextMappingId: number;

    return outlineWorker();

    function outlineWorker(): void {
        computeGeneratedLineColors();

        var writer = textwriter.create();
        writer.pipeTo(writeDocument);
        fs.writeFileSync(outFile, writer.toString(), "utf8");
    }

    function computeGeneratedLineColors(): void {
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

    function writeDocument(writer: TextWriter): void {
        writer
            .writeln('<!DOCTYPE html>')
            .writeln('<html>')
                .indent()
                .pipeTo(writeHeader)
                .pipeTo(writeBody)
                .dedent()
            .writeln('</html>');
    }

    function writeHeader(writer: TextWriter): void {    
        var stylePath = path.resolve(__dirname, "../res/runtime.css");
        writer
            .writeln('<head>')
                .indent()
                .writeln('<style>')
                    .suspendIndenting()
                    .writeln(file.readFile(stylePath))
                    .resumeIndenting()
                .writeln('</style>')
                .dedent()
        .writeln('</head>');
    }

    function writeBody(writer: TextWriter): void {
        var scriptPath = path.resolve(__dirname, "../bin/runtime.js");
        writer
            .writeln('<body>')
                .indent()
                .writeln('<div class="horizontal-panes container">')
                    .indent()
                    .writeln('<div class="vertical-panes">')
                        .indent()
                        .writeln('<div class="horizontal-panes">')
                            .indent()
                            .pipeTo(writeSourcePane)
                            .pipeTo(writeGeneratedPane)
                            .dedent()
                        .writeln('</div>')
                        .pipeTo(writeMapPane)
                        .pipeTo(writeRawMapPane)
                        .dedent()
                    .writeln('</div>')
                    .dedent()
                .writeln('</div>')
                .writeln('<script>')
                    .suspendIndenting()
                    .writeln('var lineMappings = ${lineMappings};', { lineMappings: JSON.stringify(lineMappings) })
                    .writeln('var generatedLineCount = ${generatedLineCount};', { generatedLineCount: JSON.stringify(generatedLineCount) })
                    .writeln('var sourceLineCounts = ${sourceLineCounts};', { sourceLineCounts: JSON.stringify(sourceLineCounts) })
                    .writeln(file.readFile(scriptPath))
                    .resumeIndenting()
                .writeln('</script>')
                .dedent()
            .writeln('</body>');
    }

    function writeSourcePane(writer: TextWriter): void {
        writer
            .writeln('<div class="source-pane">')
                .indent()
                .pipeTo(writeSourceName)
                .writeln('<div class="source-box">')
                    .indent()
                    .pipeEach(sourceMap.sources, writeSource)
                    .dedent()
                .writeln('</div>')
                .dedent()
            .writeln('</div>');
    }

    function writeSourceName(writer: TextWriter): void {
        writer
            .writeln('<div class="source-name">')
                .indent()
                .writeln('<select id="source">')
                    .indent()
                    .pipeEach(sourceMap.sources, writeSourceOption)
                    .dedent()
                .writeln('</select>')
                .dedent()
            .writeln('</div>');
    }

    function writeSourceOption(writer: TextWriter, source: string, sourceIndex: number): void {
        if (sourceMap.sourcesContent && sourceIndex < sourceMap.sourcesContent.length) {
            var sourcePath = source;
        } else {
            var sourcePath = path.resolve(pathRoot, source);
        }

        writer
            .writeln('<option value="${sourceIndex}">${source}</option>', { sourceIndex: sourceIndex, source: sourcePath });
    }

    function writeSource(writer: TextWriter, source: string, sourceIndex: number): void {
        var sourcePath = path.resolve(pathRoot, source);
        if (sourceMap.sourcesContent && sourceIndex < sourceMap.sourcesContent.length) {
            var sourceText = sourceMap.sourcesContent[sourceIndex];
        } else {
            var sourceText = file.readFile(sourcePath);
        }

        var sourceLines = sourceText.split(/\r\n|\r|\n/g);
        var sourceLineText = sourceLines[sourceLine];
        var lastLineMapping: decoder.LineMapping;

        sourceLineCounts[sourceIndex] = sourceLines.length;

        var padSize = sourceLines.length.toString().length;
        var mappingsForSource = lineMappings.filter(lineMapping => lineMapping.sourceIndex === sourceIndex);
        mappingsForSource.sort((left, right) => (left.sourceLine - right.sourceLine) || (left.sourceColumn - right.sourceColumn));

        writer
            .write('<div class="source" data-source="${sourceIndex}">', { sourceIndex: sourceIndex })
            .suspendIndenting();

        for (var sourceLine = 0; sourceLine < sourceLines.length; sourceLine++) {
            writer.write("<span class='linenum'>${line}: </span>", { line: pad((sourceLine + 1).toString(), padSize) });
            var lastSourceColumn: number = 0;
            var lastMappings: decoder.LineMapping[] = undefined;
            var sourceLineText = sourceLines[sourceLine];
            var mappingsForSourceLine = mappingsForSource.filter(mapping => mapping.sourceLine === sourceLine);        
            
            for (var sourceColumn = 0; sourceColumn < sourceLineText.length ; sourceColumn++) {
                var mappingsForSourceColumn = mappingsForSourceLine.filter(mapping => mapping.sourceColumn === sourceColumn);
                if (mappingsForSourceColumn.length) {
                    writePendingContent();
                    lastMappings = mappingsForSourceColumn;
                    lastSourceColumn = sourceColumn;
                }
            }
            
            writePendingContent();
            writer.writeln();        
        }

        writer
            .resumeIndenting()
            .writeln('</div>');  

        function writePendingContent(): void {
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
                } else {
                    writer.write('<span class="text">');
                }

                writer.write(encode(sourceLineText.substring(lastSourceColumn, sourceColumn)));
                writer.write('</span>');
            }
        }  
    }

    function writeGeneratedPane(writer: TextWriter): void {
        writer
            .writeln('<div class="generated-pane">')
                .indent()
                .pipeTo(writeGeneratedName)
                .writeln('<div class="generated-box">')
                    .indent()
                    .pipeTo(writeGenerated)
                    .dedent()
                .writeln('</div>')
                .dedent()
            .writeln('</div>');
    }

    function writeGeneratedName(writer: TextWriter): void {
        writer
            .writeln('<div class="generated-name">${generatedFile}</div>', { generatedFile: generatedFile });
    }

    function writeGenerated(writer: TextWriter): void {
        writer
            .write('<div class="generated">')
                .suspendIndenting()
                .pipeEach(generatedLines, writeGeneratedLine)
                .resumeIndenting()
            .writeln('</div>');
    }

    function writeGeneratedLine(writer: TextWriter, generatedLineText: string, generatedLine: number): void {
        writer.write('<span class="linenum">${line}: </span>', { line: pad(String(generatedLine + 1), generatedPadSize) });
        var mappingsForLine = lineMappings.filter(mapping => mapping.generatedLine === generatedLine);
        var lastMapping: LineMapping = undefined;
        var lastGeneratedColumn = 0;
        for (var generatedColumn = 0; generatedColumn < generatedLineText.length; generatedColumn++) {
            var mappingForGeneratedColumn = mappingsForLine.filter(mapping => mapping.generatedColumn === generatedColumn)[0];
            if (mappingForGeneratedColumn) {
                writePendingContent();
                lastMapping = mappingForGeneratedColumn;
                lastGeneratedColumn = generatedColumn;
            }
        }

        lastMapping = undefined;
        writePendingContent();
        writer.writeln();

        function writePendingContent(): void {
            if (generatedColumn > lastGeneratedColumn) {
                if (lastMapping) {
                    writer.write('<span data-source="${sourceIndex}" data-mapping="${id}" class="mapping ${color}">', {
                        sourceIndex: lastMapping.sourceIndex,
                        id: lastMapping.id,
                        color: getLineColorClass(lastMapping)
                    });
                } else {
                    writer.write('<span class="text">');
                }

                // write any previous unmapped text
                writer.write(encode(generatedLineText.substring(lastGeneratedColumn, generatedColumn)));
                writer.write('</span>');
            }
        }
    }

    function writeMapPane(writer: TextWriter): void {
        writer
            .writeln("<div class='map-pane'>")
                .indent()
                .pipeTo(writeMapName)
                .writeln('<div class="map-box">')
                    .indent()
                    .pipeTo(writeMap)
                    .dedent()
                .writeln('</div>')
                .dedent()
            .writeln('</div>');
    }

    function writeMapName(writer: TextWriter): void {
        writer
            .writeln("<div class='map-name'>${mapFile} [offsets]</div>", { mapFile: mapFile });
    }

    function writeMap(writer: TextWriter): void {
        var mappingsPerLine = generatedLines
            .map((_, generatedLine) => ({
                generatedLine: generatedLine,
                mappings: lineMappings
                    .filter(mapping => mapping.generatedLine === generatedLine)
                    .sort((a, b) => a.generatedColumn - b.generatedColumn)
        }));

        writer
            .writeln('<div class="map">')
                .indent()
                .pipeEach(mappingsPerLine, writeMapLine)
                .dedent()
            .writeln('</div>');
    }

    function writeMapLine(writer: TextWriter, mappingsForLine: { generatedLine: number; mappings: LineMapping[]; }): void {
        writer
            .write('<div class="line">')
            .write('<span class="linenum">${line}: </span>', { line: pad(String(mappingsForLine.generatedLine + 1), generatedPadSize) })
            .pipeEach(mappingsForLine.mappings, writeLineMapping)
            .writeln('</div>');
    }

    function writeLineMapping(writer: TextWriter, lineMapping: LineMapping): void {
        if ("sourceIndex" in lineMapping) {
            writer
                .write('<span data-mapping="${id}" class="mapping ${color}">${generatedColumn}->${sourceIndex}:${sourceLine},${sourceColumn}</span>', {
                    sourceIndex: lineMapping.sourceIndex,
                    id: lineMapping.id,
                    generatedColumn: lineMapping.generatedColumn + 1,
                    sourceLine: lineMapping.sourceLine + 1,
                    sourceColumn: lineMapping.sourceColumn + 1,
                    color: getLineColorClass(lineMapping)
                });
        } else {
            writer
                .write('<span data-mapping="${id}" class="mapping ${color}">${generatedColumn}</span>', {
                    sourceIndex: lineMapping.sourceIndex,
                    id: lineMapping.id,
                    generatedColumn: lineMapping.generatedColumn + 1,
                    color: getLineColorClass(lineMapping)
                });
        }
    }

    function writeRawMapPane(writer: TextWriter): void {
        writer
            .writeln('<div class="rawmap-pane">')
                .indent()
                .pipeTo(writeRawMapName)
                .writeln('<div class="rawmap-box">')
                    .indent()
                    .pipeTo(writeRawMap)
                    .dedent()
                .writeln('</div>')
                .dedent()
            .writeln('</div>');
    }

    function writeRawMapName(writer: TextWriter): void {
        writer
            .writeln("<div class='rawmap-name'>${mapFile} [raw]</div>", { mapFile: mapFile });
    }

    function writeRawMap(writer: TextWriter): void {
        var jsonwriter = textwriter.create();
        jsonwriter.pipeTo(writeRawMapJson);

        writer
            .write('<div class="rawmap">')
                .suspendIndenting()
                .write(jsonwriter.toString())
                .resumeIndenting()
            .writeln('</div>');
    }

    function writeRawMapJson(writer: TextWriter): void {
        writer
            .writeln('{')
                .indent()
                .pipeEach(entries(sourceMap), writeRawMapJsonPair, writeJsonComma)
                .writeln('')
                .dedent()
            .write('}');
    }

    function writeJsonComma(writer: TextWriter): void {
        writer.writeln(",");
    }

    function writeRawMapJsonPair(writer: TextWriter, pair: [string, any]): void {
        var key = pair[0];
        var value = pair[1];
        writer.write('"${name}": ', { name: encode(key) });
        if (key === "sources") {
            writer.pipeTo(writeRawMapJsonSources);
        } else if (key === "mappings") {
            writer.pipeTo(writeRawMapJsonMappings);
        } else {
            writer.write(JSON.stringify(value, undefined, "  "));
        }
    }

    function writeRawMapJsonSources(writer: TextWriter): void {
        writer
            .writeln('[')
                .indent()
                .pipeEach(sourceMap.sources, writeRawMapJsonSource)
                .dedent()
            .write(']');
    }

    function writeRawMapJsonSource(writer: TextWriter, source: string, sourceIndex: number): void {
        writer.writeln('<span class="rawsource" data-source="${sourceIndex}">"${source}"</span>', { sourceIndex: sourceIndex, source: encode(source) });
    }

    function writeRawMapJsonMappings(writer: TextWriter): void {
        nextMappingId = 0;
        writer.write('"').pipeEach(sourceMap.mappings.split(";"), writeRawMapJsonMappingLine, ";").write('"');
    }

    function writeRawMapJsonMappingLine(writer: TextWriter, mappingLine: string): void {
        if (mappingLine) {
            writer.pipeEach(mappingLine.split(","), writeRawMapJsonMappingSegment, ",");
        }
    }

    function writeRawMapJsonMappingSegment(writer: TextWriter, segment: string): void {
        if (segment) {
            var mapping = lineMappings[nextMappingId++];
            writer.write('<span data-mapping="${id}" class="mapping ${color}">${text}</span>', {
                id: mapping.id,
                text: encode(segment),
                color: getLineColorClass(mapping),
            });
        }
    }

    function pad(text: string, size: number): string {
        var len = size - (text ? text.length : 0);
        return Array(len + 1).join(" ") + (text || "");
    }

    function encode(text: string): string {
        return text.replace(/&(?!.{1,6};)/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }

    function entries(obj: any): [string, any][] {
        var entries: [string, any][] = [];
        for (var p in obj) {
            entries.push([p, obj[p]]);
        }

        return entries;
    }

    function getLineColorClass(mapping: LineMapping): string {
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