class AbstractSyntaxTree {
	constructor () {
		this.root = new Root();
	}
}

class TreeNode {
	constructor () {
		this.type = "string";
		this.children = "array of nodes or null";
		this.parent = "node or null";
		this.position = new Position();
	}
}

class Root extends TreeNode {
	constructor () {
		super();
		this.parent = null;
	}
}

class Branch extends TreeNode {
	constructor () {
		super();
	}
}

class Leaf extends TreeNode {
	constructor () {
		super();
		this.children = null;
	}
}

class Position {
	constructor () {
		this.start = new Point();
		this.end = new Point();
	}
}

class Point {
	constructor () {
		this.line = "number >= 1";
		this.column = "number >= 1";
	}
}