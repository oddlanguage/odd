# Object

Odd makes use of objects, much like Lua does (with tables). An object can have numeric or alphanumeric keys, and any value.

An object can also be an array. Unlike a lot of languages, an array in odd is an object but only with numerical keys(/indexes).

An object can be created and treated as an array.

Creating an object literal:
```ts
const obj: object = [
  property1 = 1;
  property2 = 2;
  property3 = 3;
];
// or
const obj: object = [
  property1 = 1,
  property2 = 2,
  property3 = 3
];
```
Note that a property within an object is assinged as if it were a statement. This allows for a more natural assignment. At the end of every property you can use either a semicolon `;`, or a comma `,`.

A trailing comma will insert an _`empty`_ element after it, while a semicolon will not.

Creating an array literal:
```ts
const arr: array = [1, 2, 3];
// or
const arr: array = [1; 2; 3;];
```

It's generally discouraged to use semicolons as delimiters within arrays.

## Object methods
An object

- concat
- array (get all numeric indexes)
- every
- fill
- filter
- find
- findIndex
- findLastIndex
- flat
- foreach
- includes
- indexOf
- map
- push
- pop
- reduce
- reverse
- shift (reversepop?)
- unshift (reversepush?)
- slice
- splice
- some
- sort
- average
- rollup
- reject/without
- max
- min
- first
- last
- clone/copy
- remove
- clear
- deduplicate/dedup
- chunks
- split
- merge

### Object.array()
Grabs all numeric indexes
- async()
Asyncs all object.array methods