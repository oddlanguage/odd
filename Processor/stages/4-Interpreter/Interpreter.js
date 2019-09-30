"use strict";
"hide implementation";

const Interpreter = require("../../../Interpreter-generator/Interpreter-generator.js");

module.exports = new Interpreter()
	.rule("function-call > *, call-args", console.log);