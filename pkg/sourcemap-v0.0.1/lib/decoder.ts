import uri = require('./uri');
import vlq = require('./vlq');

export interface SourceMap {
  version: number;
  file: string;
  sourceRoot: string;
  sources: string[];
  names: string[];
  mappings: string;
}

export interface LineMapping {
  id: number;
  generatedLine: number;
  generatedColumn: number;
  source: string;
  sourceIndex: number;
  sourceLine: number;
  sourceColumn: number;
  scopeName: string;
  scopeNameIndex: number;
}

export function decode(sourceMap: SourceMap): LineMapping[] {
  var sourceRoot = sourceMap.sourceRoot && uri.create(sourceMap.sourceRoot);
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
    var mappingSegments = mappingLines[generatedLine].split(',');
    var generatedColumn: number = 0;
    for (var segmentIndex = 0; segmentIndex < mappingSegments.length; segmentIndex++) {
      var segment = mappingSegments[segmentIndex];
      var decodedSegment = vlq.decode(segment);
      if (decodedSegment.length >= 1) {
        generatedColumn += decodedSegment[0];        
      }
      if (decodedSegment.length >= 4) {        
        sourceIndex += decodedSegment[1];
        sourceLine += decodedSegment[2];
        sourceColumn += decodedSegment[3];
      }
      if (decodedSegment.length >= 5) {
        scopeNameIndex += decodedSegment[4];
      }

      var sourceUri = uri.create(sourceMap.sources[sourceIndex]);
      if (sourceRoot) {
        sourceUri = uri.create(sourceRoot, sourceUri);
      }
      
      source = sourceUri.toString();
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
      })
    }
  }

  return mappings;
}