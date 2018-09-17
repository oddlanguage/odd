# Exists
Not every language has a way to specifically check whether a variable exists. Some languages indirectly offer ways to do so, but it often relies on weird quirks within the language. To solve this, the `exists` operator was implemented.

The `exists` operator returns `true` or `false` based on whether its operand is defined or not, respectively. There can only be one operand, which must preceed the operator:
```ts
//Proper way
if a exists {
	//...
}
//This will throw an error
if exists a {
	//...
}
//This will also throw an error
if a exists b {
	//...
}
```

## Logic
To check if one or another value exists, you must use the `exists` operator as if it were any other:
```ts
//This is the proper way
if a exists | b exists {
	//...
}

//This will not work
if a | b exists {
	//...
}
```