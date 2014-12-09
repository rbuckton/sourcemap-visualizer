/// <reference path="node.d.ts" />
var path = require('path');
var fs = require('fs');
var pkg;
try {
    var jsonPath = path.resolve(__dirname, "../package.json");
    var json = fs.readFileSync(jsonPath, "utf8");
    pkg = JSON.parse(json);
}
catch (e) {
    pkg = { name: "", version: "" };
}
module.exports = pkg;
//# sourceMappingURL=C:/Workspaces/SourceMaps/lib/package.js.map