const path = process.argv[2];

if (path) {
  import("./compiler.js").then(
    ({ default: compiler }) => compiler(path)
  );
} else {
  import("./repl.js").then(({ default: repl }) =>
    repl()
  );
}
