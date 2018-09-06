const fs = require("fs");
const { promisify } = require("util");
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const timestamp = require("./timestamp");
const define = require("./definer");
const tokenise = require("./lexer");
const preprocess = require("./preprocessor");
const parse = require("./parser");

async function compile (options) {
	const { from, to } = options;
	const input = await readFile(from, "utf8");

	if (options.verbose) console.log(`[${timestamp()}] Starting Definition Substitution.`);
	const definitions = define(input);

	if (options.verbose) console.log(`\n[${timestamp()}] Starting Lexical Analysis.`);
	const lexicalTokens = tokenise(input, {
		verbose: options.verbose,
		sourcepath: from,
		extensive: true,
		ignoreTypes: false,
		allowUnicode: false
	});

	if (options.verbose) console.log(`\n[${timestamp()}] Starting Preprocessing.`);
	const preprocessedTokens = preprocess(lexicalTokens, definitions, {
		verbose: options.verbose
	});

	if (to)	{
		await writeFile(to, JSON.stringify(lexicalTokens, null, "\t"), "utf8");
	}
	console.log("Done!");
}

const CustomError = require("./Classes/Errors/CustomError");

compile({
	from: `${__dirname}/_Source/test.odd`,
	to:   `${__dirname}/_Compiled/test.json`,
	verbose: true
}).catch(error => {
	console.log("\nAn error occured, aborting...");
	if (error instanceof CustomError) {
		console.log(error.toString());
	} else {
		console.log(error);
	}
});