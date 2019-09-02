const fs = require("fs");
const { curry } = require("./helpers/Function.js");
const wait = require("./helpers/wait.js");
const error = require("./helpers/error.js");

const input = fs.readFileSync("./test.odd", "utf8")//.createReadStream("./test.odd", { encoding: "utf8" });
const Processor = require("./Processor/Processor.js");
const lexer = require("./Processor/stages/0-Lexical-analyser/oddLexer.js");
const parser = require("./Processor/stages/1-Parser/oddParser.js");
new Processor()
	.stage("reading file",             fs.readFileSync.bind(null, "./test.odd", "utf8"))
	.stage("running lexical analysis", lexer.lex.bind(lexer))
	.stage("building syntax tree",     parser.parse.bind(parser))
	.stage("validating types",         curry(wait, Math.random()*20|0))
	.stage("optimising",               curry(wait, Math.random()*20|0))
	.stage("compiling",                curry(wait, Math.random()*20|0))
	.process(input)
	.then(output => console.log(`\nOutput: "${output}"`))
	.catch(error);