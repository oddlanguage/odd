# Define
The `define` keyword allows you to write odd code to be executed at compile time. A use case for such a thing could be the following:
```ts
// > env = ["example", "person"];
define username = (() => {
	const firstName = env[0];
	const lastName = env[1];
	return firstName.capitalise()..lastName.capitalise();
})();
console.log(username);
// < Example Person
```