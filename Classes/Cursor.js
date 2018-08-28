module.exports = class Cursor {
	constructor (position = 0) {
		this.position = position;
		this._SAVEDPOS = 0;
	}

	step () {
		this.position++;
	}

	save () {
		this._SAVEDPOS = this.position;
	}

	restore () {
		this.position = this._SAVEDPOS;
	}
}