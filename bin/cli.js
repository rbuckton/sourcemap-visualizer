var path = require('path');
var file = require('../lib/file');
var outliner = require('../lib/outliner');
var OutlineKind = outliner.OutlineKind;
if (process.argv.length > 2) {
    var generatedFile;
    var outFile;
    var sourceMapFile = process.argv[2];
    if (path.extname(sourceMapFile) === '.js') {
        generatedFile = sourceMapFile;
        sourceMapFile = sourceMapFile + '.map';
    }
    else if (path.extname(sourceMapFile) === '.map') {
        generatedFile = sourceMapFile.substr(0, sourceMapFile.length - 4);
    }
    outFile = sourceMapFile + ".html";
    console.log("sourcemap visualizer v0.0.1");
    console.log();
    console.log("generated: " + generatedFile);
    console.log("map: " + sourceMapFile);
    var sourceMap = JSON.parse(file.readFile(sourceMapFile));
    outliner.outline(outFile, generatedFile, sourceMapFile, sourceMap, 0 /* Mappings */);
    console.log("output: " + outFile);
}
//# sourceMappingURL=cli.js.map