const Parser = require("./Parser.js");

module.exports = new Parser()
	.define(`number ->
		decimal-number
		| integer-number`)
	.define(`string ->
		string
		| template-literal`)
	.define(`literal ->
		| <string>
		| literal`)
	.define(`exponentiation-expression -> <expression> operator"^" <expression>`)
	.define(`multiplication-expression -> <expression> operator"*" <expression>`)
	.define(`division-expression -> <expression> operator"/" <expression>`)
	.define(`addition-expression -> <expression> operator"+" <expression>`)
	.define(`subtraction-expression -> <expression> operator"-" <expression>`)
	.define(`math-expression ->
		<number>
		| <exponentiation-expression>
		| <multiplication-expression>
		| <division-expression>
		| <addition-expression>
		| <subtraction-expression>`)
	.define(`declaration -> type-annotation? identifier operator"=" <expression> semicolon`)
	.define(`const-definition -> storage-type"const" <declaration>`)
	.define(`var-definition -> storage-type"var" <declaration>`)
	.rule(`expression ->
		punctuation"(" expression (punctuation"," expression)* punctuation")"
		| <math-expression>
		| <literal>
		| <const-definition>
		| <var-definition>`);