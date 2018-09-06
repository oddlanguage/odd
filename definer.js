//Check through all definitions for type mismatching, multiple assignments, faulty syntax, etc. (throw preprocessingError)

const definitionTest = /^define .+;$/gm
const healthyDefinition = /define ?([\[\]}{\w:]*) (.+) = (.+);/;

class Definition {
	constructor (definition) {
		const chunks = definition.match(healthyDefinition);
		this.type = chunks[1];
		this.pattern = chunks[2];
		this.replacement = chunks[3];
	}
}

module.exports = function define (input, options) {
	const definitions = [];
	const matches = input.match(definitionTest);
	for (const match of matches) {
		if (!healthyDefinition.test(match)) throw "definitionError MAKE THIS A THING U KNOBHEAD";
		definitions.push(new Definition(match));
	}

	return definitions;
}