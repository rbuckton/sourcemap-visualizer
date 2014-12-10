/// <reference path="node.d.ts" />
var path = require('path');
var utils = require('utils');
var pkg;
try {
    var jsonPath = path.resolve(__dirname, "../package.json");
    var json = utils.readFile(jsonPath);
    pkg = JSON.parse(json);
}
catch (e) {
    pkg = { name: "", version: "" };
}
module.exports = pkg;
//# sourceMappingURL=package.js.map