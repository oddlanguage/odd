const fs = require("fs");
const error = require("./helpers/error.js");

const Processor = require("./Processor/Processor.js");
const lexer = require("./Processor/stages/0-Lexical-analyser/oddLexer.js");
const parser = require("./Processor/stages/1-Parser/oddParser.js");
const validator = require("./Processor/stages/2-Type-validator/oddTypeValidator.js");
const optimiser = require("./Processor/stages/3-Optimiser/optimiser.js");
const interpreter = require("./Processor/stages/4-Interpreter/Interpreter.js");
new Processor()
	.stage("reading file",             fs.readFileSync.bind(null, "./test.odd", "utf8"))
	.stage("running lexical analysis", lexer.lex.bind(lexer))
	.stage("building syntax tree",     parser.parse.bind(parser))
	.stage("validating types",         validator)
	.stage("optimising",               optimiser)
	.stage("interpreting",             interpreter.interpret.bind(interpreter))
	.process()
	.then(output => console.log(`\nOutput: "${output}"`))
	.catch(error);