//TODO:
//Compile from directory
//Check if locations actually exist
//Per for loop iteration, provide current path for error logging
//Make compiling steps obey compiling options.
//	extensive: whether to keep track of positional information (significant performance change)
//	verbose: whether to log important moments.

const fs = require("fs");
const { promisify } = require("util");
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const timestamp = require("./timestamp");
const tokenise = require("./lexer");
const preprocess = require("./preprocessor");
const parse = require("./parser");
const CustomError = require("./Classes/Errors/CustomError");
const args = process.argv.slice(2);
const { basename } = require("path");

if (args.length) console.log(`Arguments: ${args.join(", ")}`);

function inflect (word, count) {
	return count !== 1 ? `${word}s` : word;
}

async function compile (options) {
	if (!options.from instanceof Array) options.from = [options.from];

	console.log(`[${timestamp()}] Beginning Compilation of ${options.from.length} ${inflect("file", options.from.length)}...`);
	for (const file of options.from) {
		const path = basename(file);

		if (options.verbose) console.log(`\n[${timestamp()}] ${path}: Reading.`);
		const input = await readFile(file, "utf8");

		if (options.verbose) console.log(`[${timestamp()}] ${path}: Starting Lexical Analysis.`);
		const lexicalTokens = tokenise(input, options);

		if (options.verbose) console.log(`[${timestamp()}] ${path}: Starting Preprocessing.`);
		const preprocessedTokens = preprocess(lexicalTokens, options);

		if (options.verbose) console.log(`[${timestamp()}] ${path}: Starting Syntax Analysis.`);
		//const abstractSyntaxTree = parse(preprocessedTokens, options);
	}
	console.log(`\n[${timestamp()}] Done!`);
}

compile({
	from: [`${__dirname}/_Source/test_lexer.odd`, `${__dirname}/_Source/test_preprocessor.odd`],
	//to:   `${__dirname}/_Compiled/test.json`,
	verbose: args.includes("-v"),
	extensive: false,
	ignoreTypes: false,
	allowUnicode: false
}).catch(error => {
	console.log("\nAn error occured, aborting...");
	if (error instanceof CustomError) {
		console.log(error.toString());
	} else {
		console.log(error);
	}
});