"use strict";
"hide implementation";

const Interpreter = require("../../../Interpreter-generator/Interpreter-generator.js");
const inspect = require("../../../helpers/inspect.js");

module.exports = new Interpreter()
	.rule(`program`, inspect);