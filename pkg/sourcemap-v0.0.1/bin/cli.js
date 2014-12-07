var fs = require('fs');
var path = require('path');
var outliner = require('../lib/outliner');
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
    var sourceMap = JSON.parse(fs.readFileSync(sourceMapFile, "utf8"));
    outliner.outline(outFile, generatedFile, sourceMapFile, sourceMap);
    console.log("output: " + outFile);
}
//# sourceMappingURL=cli.js.map