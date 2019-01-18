module.exports = function assert (condition) {
	return new Assertion(condition);
}

require("prototype-extensions/String");
function getType (value) {
	try {
		return value.constructor.name.decapitalise();
	} catch {
		return typeof value;
	}
}

class Assertion {
	constructor (condition) {
		if (!["boolean", "array"].includes(getType(condition))) throw new Error(`Cannot assert non-boolean condition '${condition}'`);
		Object.assign(this, { condition });
	}

	warn (message) {
		Object.assign(this, { message, severity: "warn" });
		this.assert();
	}

	error (message) {
		Object.assign(this, { message, severity: "error" });
		this.assert();
	}

	assert () {
		function check (condition) {
			if (condition === true) return;
			switch (this.severity) {
				case "warn": {
					console.warn(this.message);
					break;
				}
				case "error": default: {
					throw new Error(this.message);
				}
			}
		}
		
		const conditions = [this.condition].flat();
		conditions.every(condition => check.call(this, condition));
	}
}