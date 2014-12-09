/// <reference path="../lib/node.d.ts" />
import fs = require('fs');
import os = require('os');
import path = require('path');
import pkg = require('../lib/package');
import file = require('../lib/file');
import outliner = require('../lib/outliner');

interface ParsedArguments {
  generatedFile?: string;
  sourceMapFile?: string;
  outFile?: string;
  printUsage?: boolean;
  printVersion?: boolean;
  message?: string;
}

process.exit(main());

function main(): number {
  var parsedArguments = parseArguments();
  if (parsedArguments.printUsage) {
    return printUsage(parsedArguments.message);
  }
  else if (parsedArguments.printVersion) {
    return printVersion();
  }
  else {
    return processSourceMap(parsedArguments.sourceMapFile, parsedArguments.generatedFile, parsedArguments.outFile);
  }
}

function parseArguments(): ParsedArguments {
  var generatedFile: string;
  var sourceMapFile: string;
  var outFile: string;  
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
      if (generatedFile || sourceMapFile) {
        return { printUsage: true, message: "unrecognized argument " + arg + "." };
      }

      if (path.extname(arg) === ".map") {
        sourceMapFile = arg;
        generatedFile = arg.substr(0, arg.length - 4);
      } else {
        generatedFile = arg;
        // NOTE: assumes same directory for now. need to parse out the sourceMappingURL comment for better reliability.
        sourceMapFile = generatedFile + ".map";
      }
    }
  }

  if (!generatedFile || !sourceMapFile) {
    return { printUsage: true, message: "the path to a generated file or source map is required." };
  }

  if (!outFile) {
    outFile = sourceMapFile + ".html";
  }

  return { generatedFile: generatedFile, sourceMapFile: sourceMapFile, outFile: outFile };
}

function printHeader(): void {
  process.stdout.write(pkg.name + " " + pkg.version + os.EOL);
}

function printUsage(message?: string): number {
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

function printVersion(): number {
  process.stdout.write(pkg.version);
  return 0;
}

function processSourceMap(sourceMapFile: string, generatedFile: string, outFile: string): number {
  printHeader();

  var sourceMapContent = file.readFile(sourceMapFile);
  var sourceMap = JSON.parse(sourceMapContent);
  outliner.outline(outFile, generatedFile, sourceMapFile, sourceMap);

  process.stdout.write(os.EOL);
  process.stdout.write("source map: " + sourceMapFile + os.EOL);
  process.stdout.write("generated:  " + generatedFile + os.EOL);
  process.stdout.write("output:     " + outFile + os.EOL);
  return 0;
}