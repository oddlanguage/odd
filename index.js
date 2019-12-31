"use strict";

const targets = process.argv.slice(2);

const fs = require("fs");
const error = require("./helpers/error.js");

const Processor = require("./Processor/Processor.js");
const lexer = require("./Processor/stages/0-Lexical-analyser/oddLexer.js");
const blocker = require("./Processor/stages/1-Blocker/blocker.js");
const parser = require("./Processor/stages/2-Parser/oddParser.js");
const validator = require("./Processor/stages/3-Type-validator/oddTypeValidator.js");
const interpret = require("./interpret.js");

// TODO: If target is directory, parse all files inside it.
for (const target of targets) {
	(async () => {
		try {
			const ast = new Processor()
				.stage("reading file",             fs.readFileSync.bind(null, target, "utf8"))
				.stage("running lexical analysis", lexer.lex.bind(lexer))
				// .stage("normalising blocks",       blocker)
				.stage("building syntax tree",     parser.parse.bind(parser))
				// .stage("validating types",         validator)
				.process()
				.catch(error);

			interpret(await ast);
		} catch (err) {
			console.error(err);
		}
	})();
}