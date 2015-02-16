/// <reference path="node.d.ts" />
import fs = require('fs');
import path = require('path');
import utils = require('./utils');
import textwriter = require('./textwriter');
import decoder = require('./decoder');

import SourceMap = decoder.SourceMap;
import IndexMap = decoder.IndexMap;
import ParsedSourceMap = decoder.ParsedSourceMap;
import Source = decoder.Source;
import Mapping = decoder.Mapping;
import Name = decoder.Name;
import Scope = decoder.Scope;
import Local = decoder.Local;
import TextWriter = textwriter.TextWriter;

export function outline(mapFile: string, outFile: string): void {
    var parsedSourceMap = decoder.decode(mapFile);
    var generatedContent = parsedSourceMap.getGeneratedFileContent();
    if (!generatedContent) return;
    var generatedLines = generatedContent.split(/\r\n|\r|\n/g);
    var generatedLineCount = generatedLines.length;
    var generatedPadSize = generatedLines.length.toString().length;
    var generatedLineColors: number[];
    var sourceLineCounts: number[] = [];
    var nextMappingIndex: number = 0;

    return outlineWorker();

    function outlineWorker(): void {
        computeLineColors();

        var writer = textwriter.create();
        writer.pipeTo(writeDocument);
        fs.writeFileSync(outFile, writer.toString(), "utf8");
    }

    function computeLineColors(): void {
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
                .writeln('<meta http-equiv="X-UA-Compatible" content="IE=edge" />')
                .writeln('<style>')
                    .suspendIndenting()
                    .writeln(utils.readFile(stylePath))
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
                    .writeln('var lineMappings = ${lineMappings};', { lineMappings: JSON.stringify(parsedSourceMap.getMappings(), undefined, "  ") })
                    .writeln('var generatedLineCount = ${generatedLineCount};', { generatedLineCount: JSON.stringify(generatedLineCount, undefined, "  ") })
                    .writeln('var sourceLineCounts = ${sourceLineCounts};', { sourceLineCounts: JSON.stringify(sourceLineCounts, undefined, "  ") })
                    .writeln(utils.readFile(scriptPath))
                    .resumeIndenting()
                .writeln('</script>')
                .dedent()
            .writeln('</body>');
    }

    function writeSourcePane(writer: TextWriter): void {
        writer
            .writeln('<div class="source-pane">')
                .indent()
                .pipeTo(writeSourceNames)
                .writeln('<div class="source-box">')
                    .indent()
                    .pipeEach(parsedSourceMap.getSources(), writeSource)
                    .dedent()
                .writeln('</div>')
                .dedent()
            .writeln('</div>');
    }

    function writeSourceNames(writer: TextWriter): void {
        writer
            .writeln('<div class="source-name">')
                .indent()
                .writeln('<select id="source">')
                    .indent()
                    .pipeEach(parsedSourceMap.getSources(), writeSourceNamesOption)
                    .dedent()
                .writeln('</select>')
                .dedent()
            .writeln('</div>');
    }

    function writeSourceNamesOption(writer: TextWriter, source: Source): void {
        var sourcePath = source.url;
        var sourceIndex = source.sourceIndex;
        writer
            .writeln('<option value="${sourceIndex}">${sourcePath}</option>', { sourceIndex: sourceIndex, sourcePath: sourcePath });
    }

    function writeSource(writer: TextWriter, source: Source): void {
        var sourcePath = source.url;
        var sourceIndex = source.sourceIndex;
        var sourceContent = parsedSourceMap.getSourceContent(sourceIndex) || "";
        var sourceLines = sourceContent.split(/\r\n|\r|\n/g);
        var lastSourceColumn = 0;
        var sourceLineContent: string;
        var lastMappings: Mapping[];

        sourceLineCounts[sourceIndex] = sourceLines.length;
        var padSize = sourceLines.length.toString().length;

        writer
            .write('<div class="source" data-source="${sourceIndex}">', { sourceIndex: sourceIndex })
            .suspendIndenting();

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

        writer
            .resumeIndenting()
            .writeln('</div>');  

        function writePendingContent(): void {
            if (sourceColumn > lastSourceColumn) {
                if (lastMappings) {
                    var color = "";
                    for (var i = lastMappings.length - 1; i >= 0; i--) {
                        if (lastMappings[i].source) {
                            color = getLineColorClass(lastMappings[i]);
                            break;
                        }
                    }

                    writer
                        .write('<span data-mapping="')
                        .pipeEach(lastMappings, writeMappingIndex, ' ')
                        .write('" class="mapping ${color}">', { color: color });
                } else {
                    writer.write('<span class="text">');
                }

                writer.write(encode(sourceLineContent.substring(lastSourceColumn, sourceColumn)));
                writer.write('</span>');
            }
        }  
    }

    function writeMappingIndex(writer: TextWriter, mapping: Mapping): void {
        writer.write(String(mapping.mappingIndex));
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
            .writeln('<div class="generated-name">${generatedFile}</div>', { generatedFile: parsedSourceMap.generatedFile });
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
        var lastMapping: Mapping = undefined;
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

        function writePendingContent(): void {
            if (generatedColumn > lastGeneratedColumn) {
                if (lastMapping) {
                    writer.write('<span data-mapping="${id}" class="mapping ${color}">', {
                        id: lastMapping.mappingIndex,
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
        writer
            .writeln('<div class="map">')
                .indent()
                .pipeEach(generatedLines, writeMapLine)
                .dedent()
            .writeln('</div>');
    }

    function writeMapLine(writer: TextWriter, generatedLineContent: string, generatedLine: number): void {
        var mappings = parsedSourceMap.getMappingsAtGeneratedLine(generatedLine);
        writer
            .write('<div class="line">')
            .write('<span class="linenum">${line}: </span>', { line: pad(String(generatedLine + 1), generatedPadSize) })
            .pipeEach(mappings, writeLineMapping)
            .writeln('</div>');
    }

    function writeLineMapping(writer: TextWriter, mapping: Mapping): void {
        if (mapping.source) {
            writer
                .write('<span data-mapping="${id}" class="mapping ${color}">${generatedColumn}->${sourceIndex}:${sourceLine},${sourceColumn}</span>', {
                    sourceIndex: mapping.source.sourceIndex,
                    id: mapping.mappingIndex,
                    generatedColumn: mapping.generatedColumn + 1,
                    sourceLine: mapping.sourceLine + 1,
                    sourceColumn: mapping.sourceColumn + 1,
                    color: getLineColorClass(mapping)
                });
        } else {
            writer
                .write('<span data-mapping="${id}" class="mapping ${color}">${generatedColumn}</span>', {
                    id: mapping.mappingIndex,
                    generatedColumn: mapping.generatedColumn + 1,
                    color: getLineColorClass(mapping)
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
        if (parsedSourceMap.isIndexMap) {
            writeRawIndexMapJson(writer);
        }
        else {
            writeRawSourceMapJson(writer, parsedSourceMap.getSourceMap(0));
        }
    }

    function writeRawIndexMapJson(writer: TextWriter): void {
    }

    function writeRawSourceMapJson(writer: TextWriter, sourceMap: SourceMap): void {
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

    function writeLeadingOrTrailingNewline(writer: TextWriter): void {
        writer.writeln();
    }

    function writeRawMapJsonPair(writer: TextWriter, pair: [string, any, any]): void {
        var key = pair[0];
        var value = pair[1];
        var obj = pair[2];
        writer.write('"${name}": ', { name: encode(key) });
        if (key === "sources") {
            writer.pipeTo(writeRawMapJsonSources, obj);
        } else if (key === "mappings") {
            writer.pipeTo(writeRawMapJsonMappings, obj);
        } else if (key === "sections") {
            writer.pipeTo(writeRawMapJsonSections, obj);
        } else {
            writer.write(JSON.stringify(value, undefined, "  "));
        }
    }

    function writeRawMapJsonSections(writer: TextWriter, indexMap: IndexMap): void {
    }

    function writeRawMapJsonSources(writer: TextWriter, sourceMap: SourceMap): void {
        writer
            .write('[')
                .indent()
                .pipeEach(sourceMap.sources, writeRawMapJsonSource, writeJsonComma, writeLeadingOrTrailingNewline, writeLeadingOrTrailingNewline)
                .dedent()
            .write(']');
    }

    function writeRawMapJsonSource(writer: TextWriter, source: string, sourceIndex: number): void {
        writer.write('<span class="rawsource" data-source="${sourceIndex}">"${source}"</span>', { sourceIndex: sourceIndex, source: encode(source) });
    }

    function writeRawMapJsonMappings(writer: TextWriter, sourceMap: SourceMap): void {
        writer.write('"').pipeEach(sourceMap.mappings.split(";"), writeRawMapJsonMappingLine, ";").write('"');
    }

    function writeRawMapJsonMappingLine(writer: TextWriter, mappingLine: string): void {
        if (mappingLine) {
            writer.pipeEach(mappingLine.split(","), writeRawMapJsonMappingSegment, ",");
        }
    }

    function writeRawMapJsonMappingSegment(writer: TextWriter, segment: string): void {
        if (segment) {
            var mapping = parsedSourceMap.getMapping(nextMappingIndex++);
            writer.write('<span data-mapping="${id}" class="mapping ${color}">${text}</span>', {
                id: mapping.mappingIndex,
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

    function entries(obj: any): [string, any, any][] {
        var entries: [string, any, any][] = [];
        for (var p in obj) {
            entries.push([p, obj[p], obj]);
        }

        return entries;
    }

    function getLineColorClass(mapping: Mapping): string {
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