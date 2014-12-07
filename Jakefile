var fs = require('fs');
var tscPath = "node_modules/typescript/bin/tsc.js";
var host = (process.env.host || process.env.SOURCEMAP_HOST || "node");
var sourcemapModules = [
  "lib/uri",
  "lib/vlq",
  "lib/textwriter",
  "lib/decoder",
  "lib/outliner",
  "bin/cli",
]

var sourcemapSources = [
  "lib/node.d.ts"
]
  .concat(sourcemapModules.map(asTypeScript));

var sourcemapOutputs = []
  .concat(sourcemapModules.map(asJavaScript))
  .concat(sourcemapModules.map(asDeclaration))
  .concat(sourcemapModules.map(asSourceMap));

var runtimeModules = [
  "bin/runtime"
];

var runtimeSources = []
  .concat(runtimeModules.map(asTypeScript));

var runtimeOutputs = []
  .concat(runtimeModules.map(asJavaScript))
  .concat(runtimeModules.map(asDeclaration))
  .concat(runtimeModules.map(asSourceMap));

var packageSources = [
  "Jakefile",
  "README.md",
  "package.json",
  "sourcemap.ps1",  
  "bin/*",
  "lib/*",
  "res/*",
];

var cliFile = "bin/cli.js";
var runtimeFile = "bin/runtime.js";

tsc(cliFile, sourcemapSources, { target: "ES5", sourceMap: true, module: "commonjs" });
tsc(runtimeFile, runtimeSources, { target: "ES5" });

packageTask("sourcemap", "v0.0.1", function() {
  this.packageFiles.include(packageSources);
  this.needZip = true;
  this.zipCommand = '"C:\\Program Files\\7-Zip\\7z.exe" a'
});

task("cli", [cliFile])
task("runtime", [runtimeFile])

task("clean-cli", function() {
  sourcemapOutputs.forEach(cleanFile);
});

task("clean-runtime", function() {
  runtimeOutputs.forEach(cleanFile);
});

task("local", ["cli", "runtime"]);
task("clean", ["clean-cli", "clean-runtime"]);
task("default", ["local"]);

function tsc(outFile, sources, options) {
  file(outFile, sources, function() {
    var cmd = [host, tscPath].concat(sources);
    for (var key in options) {
      var value = options[key];
      if (value === true) {
        cmd.push("--" + key);
      } else if (value !== false) {
        cmd.push("--" + key, value);
      }
    }

    cmd = cmd.join(" ");
    console.log(cmd + "\n");
    var ex = jake.createExec([cmd]);
      ex.addListener("stdout", function(output) {
          process.stdout.write(output);
      });
      ex.addListener("stderr", function(error) {
          process.stderr.write(error);
      });
      ex.addListener("cmdEnd", function() {
          complete();
      });
      ex.addListener("error", function() {
          console.log("Compilation of " + outFile + " unsuccessful");
      });
      ex.run();        
  }, { async: true });
}

function cleanFile(file) {
  if (fs.existsSync(file)) {
    jake.rmRf(file);
  }
}

function asTypeScript(module) { return module + ".ts"; }
function asJavaScript(module) { return module + ".js"; }
function asDeclaration(module) { return module + ".d.ts"; }
function asSourceMap(module) { return module + ".js.map"; }