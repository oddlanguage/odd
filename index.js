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

if (args.length) console.log(`Arguments: ${args.join(", ")}`);

async function compile (options) {
	console.log(`[${timestamp()}] Beginning Compilation...`);
	const input = await readFile(options.from, "utf8");

	if (options.verbose) console.log(`\n[${timestamp()}] Starting Lexical Analysis.`);
	const lexicalTokens = tokenise(input, options);

	if (options.verbose) console.log(`\n[${timestamp()}] Starting Preprocessing.`);
	const preprocessedTokens = preprocess(lexicalTokens, options);

	if (options.verbose) console.log(`\n[${timestamp()}] Starting Syntax Analysis.`);
	//const abstractSyntaxTree = parse(preprocessedTokens, options);

	if (options.to)	{
		await writeFile(options.to, JSON.stringify(lexicalTokens, null, "\t"), "utf8");
	}
	console.log(`\n[${timestamp()}] Done!`);
}

compile({
	from: `${__dirname}/_Source/test_preprocessor.odd`,
	to:   `${__dirname}/_Compiled/test.json`,
	verbose: args.includes("-v"),
	extensive: true,
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