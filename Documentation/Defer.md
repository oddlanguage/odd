# Defer
The defer statement is used to tell the compiler to only execute the following expression at the end of the current scope. This allows for a much cleaner codeflow. Take this pseudocode as an example:
```ts
const file = io.open("filename.odd", "r");
doSomethingWith(file);
/*


many more lines


*/
doSomethingElse(file);
io.close(file);
```
It might be intuitive to open a file, work with it and then close it afterwards, but that isn't always very readable.
Using the defer syntax you can do this:
```ts
const file = io.open("filename.odd", "r");
defer io.close(file);
doSomethingWith(file);
doSomethingElse(file);
/*


many more lines


*/
```
This way, you tell the compiler to call io.close only after the entire block has been executed.

Note that the order in which deferred statements get called is reversed in respect to the order in which they were declared:
```ts
console.log("One");
defer console.log("Two");
defer console.log("Three");
console.log("Four");
/*
< One
< Four
< Three
< Two
*/
```