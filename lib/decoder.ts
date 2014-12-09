/// <reference path="node.d.ts" />
import url = require('url');
import path = require('path');
import file = require('./file');
import vlq = require('./vlq');

export interface SourceMap {
  version: number;
  file: string;
  sourceRoot: string;
  sources: string[];
  names: string[];
  mappings: string;
  x_ms_scopes?: string;
  x_ms_locals?: string;
}

export interface LineMapping {
  id: number;
  generatedLine: number;
  generatedColumn: number;
  source?: string;
  sourceIndex?: number;
  sourceLine?: number;
  sourceColumn?: number;
  scopeName?: string;
  scopeNameIndex?: number;
}

export interface Scope {
  scopeIndex: number;
  parent: Scope;
  startLine: number;
  startColumn: number;
  endLine: number;
  endColumn: number;
  nested: Scope[];
  locals: LocalMapping[];
}

export interface LocalMapping {
  scopeIndex: number;
  generatedNameIndex: number;
  generatedName: string;
  sourceNameIndex: number;
  sourceName: string;
  isHidden: boolean;
  isRenamed: boolean;
}

export function decode(sourceMap: SourceMap): LineMapping[] {
  var sourceRoot = file.resolvePath(sourceMap.sourceRoot);
  var mappings: LineMapping[] = [];
  var generatedLine: number;
  var sourceIndex: number = 0;
  var sourceLine: number = 0;
  var sourceColumn: number = 0;
  var source: string;
  var scopeNameIndex: number = 0;
  var scopeName: string;
  var mappingLines: string[] = sourceMap.mappings.split(';');
  for (generatedLine = 0; generatedLine < mappingLines.length; generatedLine++) {
    var mappingLine = mappingLines[generatedLine];
    if (!mappingLine) continue;

    var mappingSegments = mappingLines[generatedLine].split(',');
    var generatedColumn: number = 0;
    for (var segmentIndex = 0; segmentIndex < mappingSegments.length; segmentIndex++) {
      var segment = mappingSegments[segmentIndex];
      var decodedSegment = vlq.decode(segment);
      if (decodedSegment.length >= 1) {
        generatedColumn += decodedSegment[0];
        if (decodedSegment.length >= 4) {
          sourceIndex += decodedSegment[1];
          sourceLine += decodedSegment[2];
          sourceColumn += decodedSegment[3];
          if (decodedSegment.length >= 5) {
            scopeNameIndex += decodedSegment[4];
          }
          source = file.resolvePath(sourceMap.sources[sourceIndex], sourceRoot);
          scopeName = sourceMap.names[scopeNameIndex];
          mappings.push({
            id: mappings.length,
            generatedLine: generatedLine,
            generatedColumn: generatedColumn,
            source: source,
            sourceIndex: sourceIndex,
            sourceLine: sourceLine,
            sourceColumn: sourceColumn,
            scopeName: scopeName,
            scopeNameIndex: scopeNameIndex
          });
        } else {
          mappings.push({
            id: mappings.length,
            generatedLine: generatedLine,
            generatedColumn: generatedColumn
          });
        }
      }
    }
  }

  return mappings;
}

export function decodeScopes(sourceMap: SourceMap, nested?: boolean): Scope[] {
  var scopes = sourceMap.x_ms_scopes;
  if (!scopes) return;

  var locals = sourceMap.x_ms_locals;
  var names = sourceMap.names;

  var scopeStack: Scope[] = [];
  var scopeCollection: Scope[] = [];
  var scopeIndex: number = 0;
  var topScopeCollection: Scope[] = [];
  var nameIndex: number = 0;
  var scopeStringlastIndex: number = 0;
  var scopeChars: RegExp = /[><]/g;
  var line: number = 0;
  var column: number = 0;
  var match: RegExpMatchArray;
  var currentScope: Scope;

  if (locals) {
    var scopeLocalMappingsArray = locals.split(';');
  }

  while (match = scopeChars.exec(scopes)) {
    var scopeOffsets = vlq.decode(scopes.substr(scopeStringlastIndex, match.index - scopeStringlastIndex));
    var lineOffset = scopeOffsets[0];
    var columnOffset = scopeOffsets[1];
    
    line += lineOffset;
    column += columnOffset;

    switch (match[0]) {
      case '>':
        var parentScope = scopeStack[scopeStack.length - 1];
        var scopeIndex = scopeCollection.length;
        currentScope = {
          scopeIndex: scopeIndex,
          parent: parentScope,
          startLine: line,
          startColumn: column,
          endLine: undefined,
          endColumn: undefined,
          nested: [],
          locals: []
        };

        if (scopeLocalMappingsArray && scopeIndex < scopeLocalMappingsArray.length) {
          var scopeLocalMappings = scopeLocalMappingsArray[scopeIndex];
          if (scopeLocalMappings) {
            var scopeLocalsArray = scopeLocalMappings.split(',');
            for (var scopeLocalIndex = 0; scopeLocalIndex < scopeLocalsArray.length; scopeLocalIndex++) {
              var localOffsets = vlq.decode(scopeLocalsArray[scopeLocalIndex]);
              var generatedNameOffset = localOffsets[0];

              nameIndex += generatedNameOffset;

              var generatedNameIndex = nameIndex;
              var generatedName = names[generatedNameIndex];
              var isHidden = localOffsets.length === 1;

              if (!isHidden) {
                var sourceNameOffset = localOffsets[1];

                nameIndex += sourceNameOffset;

                var sourceNameIndex = nameIndex;
                var sourceName = names[sourceNameIndex];
              }

              var isRenamed = !isHidden && generatedName !== sourceName;

              var local: LocalMapping = {
                scopeIndex: scopeIndex,
                generatedNameIndex: generatedNameIndex,
                generatedName: generatedName,
                sourceNameIndex: sourceNameIndex,
                sourceName: sourceName,
                isHidden: isHidden,
                isRenamed: isRenamed
              };

              currentScope.locals.push(local);
            }
          }
        }

        if (parentScope) {
          parentScope.nested.push(currentScope);
        } else {
          topScopeCollection.push(currentScope);
        }

        scopeStack.push(currentScope);
        scopeCollection.push(currentScope);

        break;

      case '<':
        var currentScope = scopeStack.pop();
        currentScope.endLine = line;
        currentScope.endColumn = column;
    }

    scopeStringlastIndex = scopeChars.lastIndex;
  }

  if (nested) {
    return topScopeCollection;
  } else {
    return scopeCollection;
  }
}