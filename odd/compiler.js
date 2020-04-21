"use strict";

import Util from "util";
import { overwrite, capitalise, partition } from "../util.js";
import Path from "path";
import Pipeline from "./Pipeline/Pipeline.js";
import File from "../File.js";
import Url from 'url';
import oddlexer from "./lexer.js";
import oddparser from "./parser.js";

const hyphenLike = /^[-–]/; // Some terminals/hosts replace hyphens with en/em-dashes... wtf???
const files = process.argv
	.slice(2)
	.filter(arg => !hyphenLike.test(arg));

if (!files.length) {
	console.error("No target file specified.");
	process.exit(1);
}

const pipes = [
	new Pipeline()
		.stage("reading file",
			() => File.stream(
				"file:"
				+ Path.resolve(
						Path.dirname(
							Url.fileURLToPath(import.meta.url)),
					files[0])))
		.stage("generating lexer",
			stream => oddlexer.lex(stream))
		.stage("parsing",
			tokens => oddparser.parse(tokens))
];

Object.assign(Util.inspect.styles, {
	bigint: "magenta",
	boolean: "magenta",
	null: "magenta",
	undefined: "magenta",
	number: "magenta",
	date: "cyan",
	symbol: "cyan",
	string: "yellow",
	regexp: "yellow"
});

pipes.map(
	pipe => pipe
		.process()
		.then(result => console.log(Util.inspect(result, false, Infinity, true)))
		.catch(error => overwrite(
			`❌ ${capitalise(error.name)} ERROR: ${(error?.message?.stack) ? error.message.stack.split("\n").filter(ln => !(/internal\//.test(ln))).join("\n") : error.message}`)));