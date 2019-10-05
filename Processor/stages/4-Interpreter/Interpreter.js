"use strict";
"hide implementation";

const Interpreter = require("../../../Interpreter-generator/Interpreter-generator.js");

module.exports = new Interpreter()
	.rule(`math-atom`, console.log);