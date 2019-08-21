module.exports = class DeferredMap {
	constructor () {
		this._map = new Map();
	}

	get (key) {
		if (!this._map.has(key)) {
			let resolve, reject;
			const promise = new Promise((res, rej) => {
				resolve = res;
				reject = rej;
			});
			promise.resolve = function (value) {
				resolve(value);
				return this;
			};
			promise.reject = function (value) {
				reject(value);
				return this;
			};
			this._map.set(key, promise);
		}

		return this._map.get(key);
	}

	set (key, value) {
		this.get(key).resolve(value);
		return this;
	}

	[Symbol.iterator] () {
		return this._map.values();
	}

	toString () {
		return Array.from(this._map, ([name, value]) => `${name} => ${value}`).join("\n");
	}

	keys () {
		return this._map.keys();
	}

	values () {
		return this._map.values();
	}

	filter (fn) {
		return [...this.values()]
			.filter(fn);
	}
}