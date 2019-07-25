"use strict";
"hide implementation";

class Assertion {
	constructor (expression) {
		//constructor cannot be async so awaiting must be deferred to all other methods :(
		this.__EXPRESSION = expression;
	}

	/**
	 * A more explicit way of asserting the preceeding expression `and` the current `expression`.
	 * @param {boolean} expression
	 */
	and (expression) {
		this.__EXPRESSION = (this.__EXPRESSION && expression);
		return this;
	}

	/**
	 * A more explicit way of asserting the preceeding expression `or` the current `expression`.
	 * @param {boolean} expression
	 */
	or (expression) {
		this.__EXPRESSION = (this.__EXPRESSION || expression);
		return this;
	}

	/** Ignores whether the assertion succeeds or fails. */
	async ignore () {
		return this;
	}

	/**
	 * Send a warning when the assertion(s) fail(s).
	 * @param {string} message - The message you want to log in the console.
	 */
	async warn (message) {
		if (await this.__EXPRESSION === false) console.warn(message);
		return this.__EXPRESSION;
	}

	/**
	 * Throw an error when the assertion(s) fail(s).
	 * @param {string} message - The reason from throwing an error.
	 */
	async error (message) {
		if (await this.__EXPRESSION === false) throw new Error(message);
		return this.__EXPRESSION;
	}
}

/**
 * Assert that `expression === true`. Call `.ignore()`, `.warn()` or `.error()` to handle the outcome of the assertion.
 * @param {boolean} expression
 */
module.exports = function assert (expression) {
	return new Assertion(expression);
}