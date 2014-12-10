/// <reference path="../lib/node.d.ts" />
var os = require('os');
var pkg = require('../lib/package');
var outliner = require('../lib/outliner');
process.exit(main());
function main() {
    var parsedArguments = parseArguments();
    if (parsedArguments.printUsage) {
        return printUsage(parsedArguments.message);
    }
    else if (parsedArguments.printVersion) {
        return printVersion();
    }
    else {
        return processSourceMap(parsedArguments.sourceMapFile, parsedArguments.outFile);
    }
}
function parseArguments() {
    var sourceMapFile;
    var outFile;
    for (var i = 2; i < process.argv.length; i++) {
        var arg = process.argv[i];
        if (/^(-h|--help)$/.test(arg)) {
            return { printUsage: true };
        }
        else if (/^(-v|--version)$/.test(arg)) {
            return { printVersion: true };
        }
        else if (/^(-o|--out)$/.test(arg)) {
            if (outFile) {
                return { printUsage: true, message: "argument " + arg + " cannot be specified more than once." };
            }
            else if (i + 1 >= process.argv.length) {
                return { printUsage: true, message: "argument " + arg + " missing a path." };
            }
            outFile = process.argv[++i];
        }
        else {
            if (sourceMapFile) {
                return { printUsage: true, message: "unrecognized argument " + arg + "." };
            }
            sourceMapFile = arg;
        }
    }
    if (!sourceMapFile) {
        return { printUsage: true, message: "the path to a source map is required." };
    }
    if (!outFile) {
        outFile = sourceMapFile + ".html";
    }
    return { sourceMapFile: sourceMapFile, outFile: outFile };
}
function printHeader() {
    process.stdout.write(pkg.name + " " + pkg.version + os.EOL);
}
function printUsage(message) {
    printHeader();
    process.stdout.write("Usage: sourcemap [options] <generated_file | map_file>" + os.EOL);
    process.stdout.write(os.EOL);
    process.stdout.write("Examples: sourcemap generated.js --out generated.html" + os.EOL);
    process.stdout.write(os.EOL);
    process.stdout.write("Options:" + os.EOL);
    process.stdout.write(" -v, --version  Prints the version." + os.EOL);
    process.stdout.write(" -h, --help     Print this message." + os.EOL);
    process.stdout.write(" -o, --out      The output file for the HTML visualization." + os.EOL);
    if (message) {
        process.stdout.write(os.EOL);
        process.stderr.write("abort: " + message + os.EOL);
        return -1;
    }
    return 0;
}
function printVersion() {
    process.stdout.write(pkg.version + os.EOL);
    return 0;
}
function processSourceMap(sourceMapFile, outFile) {
    printHeader();
    outliner.outline(sourceMapFile, outFile);
    process.stdout.write(os.EOL);
    process.stdout.write("source map: " + sourceMapFile + os.EOL);
    process.stdout.write("output:     " + outFile + os.EOL);
    return 0;
}
//# sourceMappingURL=cli.js.map