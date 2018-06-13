# When Emits
With odd, it's my primary purpose to provide robust and intuitive ways to code. Even when doing asynchronous programming.
In a lot of languages, the way to specify asynchronous handling is with callbacks. I don't specifically have a grudge against callbacks, but they're often implemented unintuitively.
See this example:
```ts
const stream = fs.read("file/name.ext");
// We assume fs.read returns a ReadStream with an 'on' method for handling callbacks

stream.on("error", error => {
  throw error;
});

stream.on("data", data => {
  print(data);
});

stream.on("end", () => {
  stream.destroy();
});
```
This method is nice enough, and works, but could be better. What if we could just do this:
```ts
const stream = fs.read("file/name.ext");
// We assume fs.read returns a ReadStream that emits events such as
//'error', 'data' and/or 'end'.

when stream emits "error", error => {
  throw error;
}

when stream emits "data", data => {
  print(data);
}

when stream emits "end", () => {
  stream.destroy();
}
```
Note that it's not my intention to lessen the verbosity of code, but rather make it flow more naturally, as if it were a spoken language. With that in mind, I think this is a great and intuitive solution for asynchronous callbacks.