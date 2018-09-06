Using the keyword `meta`<sup>[[1]](###editor)</sup> you can define or alter the way a value is operated on.
the syntax is easy:
```ts
class Vector2 {
	constructor (flo: x | 0, flo: y | 0) {
		public flo: x = x;
		public flo: y = y;
	}

	set (x, y) {
		this.x = x;
		this.y = y;
	}

	meta + (vector2: a, vector2: b) {
		return this.set(a.x + b.x, a.y + b.y);
	}
}
```

### Editor's note(s)
\[1]: Maybe use the keyword `operator` like C does. the implementation is pretty much the same.