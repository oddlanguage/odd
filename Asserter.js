module.exports = class Asserter {
	constructor (classname) {
		this.classname = classname;
	}

	assert (property, severity = "error") {
		//Assert that this[property] exists, and it is a usable value.
		//If not, ignore, warn or error depending on severity of property's absence.
		if (this.hasOwnProperty(property) && this[property] !== null) return this;
		switch (severity) {
			case 0: case "ignore": {
				return this;
			}
			case 1: case "warn": {
				console.log(`Expected '${property}', trying to ${this.classname} without...`);
				return this;
			}
			case 2: case "error": {
				throw new Error(`Cannot ${this.classname} without ${property}.`);
			}
		}
	}
}