"use strict";

const fs = require("fs");
const error = require("./helpers/error.js");

const Processor = require("./Processor/Processor.js");
const lexer = require("./Processor/stages/0-Lexical-analyser/oddLexer.js");
const blocker = require("./Processor/stages/1-Blocker/blocker.js");
const parser = require("./Processor/stages/2-Parser/oddParser.js");
const validator = require("./Processor/stages/3-Type-validator/oddTypeValidator.js");
const IRGenerator = require("./Processor/stages/4-IR-generator/oddIRGenerator.js");
new Processor()
	.stage("reading file",                fs.readFileSync.bind(null, "./test/composition.odd", "utf8"))
	.stage("running lexical analysis",    lexer.lex.bind(lexer))
	.stage("Logging just for fun",        tokens => console.log(tokens.map(token => token.type)))
	.stage("normalising blocks",          blocker)
	.stage("Logging just for fun",        tokens => console.log(tokens.map(token => token.type)))
	.stage("building syntax tree",        parser.parse.bind(parser))
	.stage("validating types",            validator)
	.stage("generating itermediate code", IRGenerator.generate.bind(IRGenerator))
	.process()
	.then(output => console.log(`\nOutput: "${output}"`))
	.catch(error);