/// <reference path="node.d.ts" />
import path = require('path');
import fs = require('fs');
import utils = require('./utils');

interface Package {
	name: string;
	description?: string;
	keywords?: string[];
	version: string;
	author?: { name: string; email: string; url: string; };
	bin?: { [key: string]: string; };
	dependencies?: { [key: string]: string; };
	devDependencies?: { [key: string]: string; };
	engines?: { [key: string]: string; }
}

var pkg: Package;
try {
	var jsonPath: string = path.resolve(__dirname, "../package.json");
	var json: string = utils.readFile(jsonPath);
	pkg = <Package>JSON.parse(json);
} catch (e) {
	pkg = { name: "", version: "" };
}

export = pkg;
