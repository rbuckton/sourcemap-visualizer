import fs = require('fs');
import path = require('path');
import file = require('./file');
import textwriter = require('./textwriter');
import decoder = require('./decoder');

import SourceMap = decoder.SourceMap;
import LineMapping = decoder.LineMapping;
import Scope = decoder.Scope;
import LocalMapping = decoder.LocalMapping;
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

  if (scopes) {
    var scopesByStartLine = new Map<number, Map<number, Scope>>();
    var scopesByEndLine = new Map<number, Map<number, Scope>>();
    scopes.forEach(scope => {
      var scopesByStartLineStartColumn = scopesByStartLine.get(scope.startLine);
      if (!scopesByStartLineStartColumn) {
        scopesByStartLineStartColumn = new Map<number, Scope>();
        scopesByStartLine.set(scope.startLine, scopesByStartLineStartColumn);
      }

      scopesByStartLineStartColumn.set(scope.startColumn, scope);

      var scopesByEndLineEndColumn = scopesByEndLine.get(scope.endLine);
      if (!scopesByEndLineEndColumn) {
        scopesByEndLineEndColumn = new Map<number, Scope>();
        scopesByEndLine.set(scope.endLine, scopesByEndLineEndColumn);
      }

      scopesByEndLineEndColumn.set(scope.endColumn, scope);
    });
  }

  var writer = textwriter.create();
  writer.pipeTo(writeDocument);
  fs.writeFileSync(outFile, writer.toString(), "utf8");

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
            .dedent()
          .writeln('</div>')
          .dedent()
        .writeln('</div>')
        .writeln('<script>')
          .indent()
          .writeln('var lineMappings = ${lineMappings};', { lineMappings: JSON.stringify(lineMappings) })
          .writeln('var generatedLineCount = ${generatedLineCount};', { generatedLineCount: JSON.stringify(generatedLineCount) })
          .writeln('var sourceLineCounts = ${sourceLineCounts};', { sourceLineCounts: JSON.stringify(sourceLineCounts) })
          .writeln(file.readFile(scriptPath))
          .dedent()
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
    var sourcePath = path.resolve(pathRoot, source);
    writer
      .writeln('<option value="${sourceIndex}">${source}</option>', { sourceIndex: sourceIndex, source: sourcePath });
  }

  function writeSource(writer: TextWriter, source: string, sourceIndex: number): void {
    var sourcePath = path.resolve(pathRoot, source);
    var sourceText = file.readFile(sourcePath);
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
          for (var i = 0; i < lastMappings.length; i++) {
            var mapping = lastMappings[i];
            writer.write('<span data-source="${sourceIndex}" data-mapping="${id}" class="mapping linecolor${color}">', {
              sourceIndex: mapping.sourceIndex,
              id: mapping.id,
              color: mapping.generatedLine % 6
            });
          }
        } else {
          writer.write('<span class="text">');
        }

        writer.write(encode(sourceLineText.substring(lastSourceColumn, sourceColumn)));

        if (lastMappings) {
          for (var i = 0; i < lastMappings.length; i++) {
            writer.write('</span>');
          }
        } else {
          writer.write('</span>');
        }
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
        .suspendIndenting();

    for (var generatedLine = 0; generatedLine < generatedLines.length; generatedLine++) {
      writer.write('<span class="linenum">${line}: </span>', { line: pad(String(generatedLine + 1), generatedPadSize) });
      var lastMapping: decoder.LineMapping = undefined;
      var lastGeneratedColumn = 0;
      var generatedLineText = generatedLines[generatedLine];
      var mappingsForLine = lineMappings.filter(mapping => mapping.generatedLine === generatedLine);

      for (var generatedColumn = 0; generatedColumn < generatedLineText.length ; generatedColumn++) {
        var mappingForGeneratedColumn = mappingsForLine.filter(mapping => mapping.generatedColumn === generatedColumn)[0];
        if (mappingForGeneratedColumn) {
          writePendingContent();
          lastMapping = mappingForGeneratedColumn;
          lastGeneratedColumn = generatedColumn;
        }
      }
      
      writePendingContent();
      writer.writeln();
    }

    writer
        .resumeIndenting()
      .writeln('</div>');

    function writePendingContent(): void {
      if (generatedColumn > lastGeneratedColumn) {

        if (lastMapping) {
          writer.write('<span data-source="${sourceIndex}" data-mapping="${id}" class="mapping linecolor${color}">', {
            sourceIndex: lastMapping.sourceIndex,
            id: lastMapping.id,
            color: generatedLine % 6
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

  function writeGeneratedScopes(writer: TextWriter): void {
    var scopeStack: Scope[] = [];
    var currentScope: Scope;

    writer
      .write('<div class="generated-scopes">')
        .suspendIndenting();

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
              writeScopeSpanStart(writer, newScope, scopeStack.length, /*startScope*/ true);
              scopeStack.push(newScope);
              currentScope = newScope;
            }
          } 
          else if (currentScope && currentScope.endLine === generatedLine && currentScope.endColumn === generatedColumn) {
            writePendingContent();
            lastGeneratedColumn = generatedColumn;
            writeScopeSpanEnd(writer, currentScope, scopeStack.length, /*endScope*/ true);
            currentScope = scopeStack.pop();
          }
        }
      }
      
      writePendingContent();      
      writer.pipeEach(scopeStack, writeScopeSpanEnd);
      writer.writeln();
    }

    writer
        .resumeIndenting()
      .writeln('</div>');

    function writePendingContent(): void {
      if (generatedColumn > lastGeneratedColumn) {
        // write any previous unmapped text
        writer.write(encode(generatedLineText.substring(lastGeneratedColumn, generatedColumn)));
      }
    }
  }

  function writeScopeSpanStart(writer: TextWriter, scope: Scope, index: number, startScope?: boolean): void {
        writer
          .writeln('<span class="${class}" title="[${startLine}:${startColumn}::${endLine}:${endColumn}]', {
            class: startScope ? "start-scope" : "ambient-scope",
            startLine: scope.startLine + 1,
            startColumn: scope.startColumn + 1,
            endLine: scope.endLine + 1,
            endColumn: scope.endColumn + 1
          })
          .pipeEach(scope.locals, writeLocalTitleText)
          .write('">');
  }

  function writeScopeSpanEnd(writer: TextWriter, scope: Scope, index: number, endScope?: boolean): void {
    if (endScope) {
      writer.write('<span class="end-scope"></span>');
    }

    writer.write('</span>');
  }

  function writeLocalTitleText(writer: TextWriter, local: LocalMapping): void {
    writer.writeln();
    if (local.isHidden) {
      writer.write('&lt;${generatedName}&gt;', { generatedName: local.generatedName });
    } else if (local.isRenamed) {
      writer.write('${generatedName} -&gt; ${sourceName}', { generatedName: local.generatedName, sourceName: local.sourceName });
    } else {
      writer.write(local.generatedName);
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
      .writeln("<div class='map-name'>${mapFile}</div>", { mapFile: mapFile });
  }

  function writeMap(writer: TextWriter): void {
    writer
      .writeln('<div class="map">')
        .indent();

    for (var generatedLine = 0; generatedLine < generatedLines.length; generatedLine++) {
      writer
        .write('<div class="line">')
          .write('<span class="linenum">${line}: </span>', { line: pad(String(generatedLine + 1), generatedPadSize) });

      var mappingsForLine = lineMappings.filter(mapping => mapping.generatedLine === generatedLine);
      mappingsForLine.sort((a, b) => a.generatedColumn - b.generatedColumn);

      writer
        .pipeEach(mappingsForLine, writeLineMapping);

      writer
        .writeln('</div>');
    }
  }

  function writeLineMapping(writer: TextWriter, lineMapping: LineMapping): void {
    writer
      .write('<span data-mapping="${id}" data-source="${sourceIndex}" class="mapping linecolor${color}">${generatedColumn}->${sourceIndex}:${sourceLine},${sourceColumn}</span>', {
        sourceIndex: lineMapping.sourceIndex,
        id: lineMapping.id,
        generatedColumn: lineMapping.generatedColumn,
        sourceLine: lineMapping.sourceLine,
        sourceColumn: lineMapping.sourceColumn,
        color: lineMapping.generatedLine % 6
      });
  }

  function pad(text: string, size: number): string {
    var len = size - (text ? text.length : 0);
    return Array(len + 1).join(" ") + (text || "");
  }

  function encode(text: string): string {
    return text.replace(/&(?!.{1,6};)/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
}