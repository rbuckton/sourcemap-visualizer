var uri = require('./uri');
var vlq = require('./vlq');
function decode(sourceMap) {
    var sourceRoot = sourceMap.sourceRoot && uri.create(sourceMap.sourceRoot);
    var mappings = [];
    var generatedLine;
    var sourceIndex = 0;
    var sourceLine = 0;
    var sourceColumn = 0;
    var source;
    var scopeNameIndex = 0;
    var scopeName;
    var mappingLines = sourceMap.mappings.split(';');
    for (generatedLine = 0; generatedLine < mappingLines.length; generatedLine++) {
        var mappingSegments = mappingLines[generatedLine].split(',');
        var generatedColumn = 0;
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
            });
        }
    }
    return mappings;
}
exports.decode = decode;
//# sourceMappingURL=decoder.js.map