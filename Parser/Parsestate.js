"use strict";

export default class Parsestate {

	#index = 0;
	#furthest = 0;

	get index () {
		return this.#index;
	}

	get furthest () {
		return this.#furthest;
	}

	save () {
		return this.#index;
	}

	restore (last) {
		this.#furthest = Math.max(last, this.#furthest);
		this.#index = last;
	}

	advance () {
		this.#index += 1;
	}

}