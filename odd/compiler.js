"use strict";

import Util from "util";
import Path from "path";
import Pipeline from "../Pipeline/Pipeline.js";
import File from "../File/File.js";
import Url from 'url';
import metalexer from "./metalexer.js";
import metaparser from "./metaparser.js";
import lexer from "./lexer.js";
import stringify from "./stringify.js";
import fs from "fs";
import { countSuffix } from "../util.js";

const hyphenLike = /^[-–]/; // Some terminals/hosts replace hyphens with en/em-dashes... wtf???
const files = process.argv
	.slice(2)
	.filter(arg => !hyphenLike.test(arg));

if (!files.length) {
	console.error("No target files specified.");
	process.exit(1);
}

if (files.length < 2) {
	console.error("No target file specified.");
	process.exit(1);
}

const pathFromRoot = url =>
	"file://"
	+ Path.resolve(
			Path.dirname(
				Url.fileURLToPath(import.meta.url)),
		"../",
		url);

const pathFromHere = url => pathFromRoot(Path.resolve("odd/", url));

const temporaryParser = pathFromHere("./TEST.js");

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

const inspect = result => console.log(Util.inspect(result, false, Infinity, true));

const pipes = [
	new Pipeline()
		.stage(`reading ${files[0]}`,
			() => File.readStream(pathFromRoot(files[0])))
		.stage("generating lexer",
			stream => metalexer.lex(stream))
		.stage("parsing parser",
			tokens => metaparser.parse(tokens))
		.stage("generating parser",
			result => stringify(result.AST()))
		.stage("saving parser",
			data => File.writeStream(temporaryParser, data))
		.stage("parsing original file with generated parser",
			async () => (await import(temporaryParser)).default.parse(lexer.lex(File.readStream(pathFromRoot(files[1])))))
		.stage("cleanup",
			ast => (fs.promises.unlink(Url.fileURLToPath(temporaryParser)), ast))
];

Promise.all(
	pipes.map(
		pipe => pipe
			.process()
			.then(result => inspect(result.AST()))))
	.then(results => console.log(`\nCompilation done; processed ${pipes.length} ${countSuffix("pipe", pipes.length)}.`))
	.catch(error => console.error(error));