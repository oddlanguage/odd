module.exports = function preprocess (tokens) {
	const directives = tokens.filter(token => {
		return (token.type === "preprocessorDirective" || token.lexeme === "define")
	});
	console.log(directives)
}