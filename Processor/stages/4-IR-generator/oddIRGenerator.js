"use strict";

const IRGenerator = require("../../../IR-Generator/IR-Generator.js");

const gen = new IRGenerator();
let i = 0;

module.exports = gen
	.rule("const-assignment", node => `const ${i++} val`)
	.rule("var-assignment", node => `var ${i++} val`)