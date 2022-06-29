const target = process.argv[2];

if (target) {
  import("./compiler.js").then(
    ({ default: compiler }) => compiler(target)
  );
} else {
  import("./repl.js").then(({ default: repl }) =>
    repl()
  );
}
