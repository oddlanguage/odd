import { readFile, readdir } from "node:fs/promises";
import { Worker } from "node:worker_threads";

// NOTE: This keeps the vent loop alive.
// Nodejs doesn't wait for "empty" promises
// https://github.com/nodejs/node/issues/22088
const timeout = setTimeout(() => {
  throw "Why did this not terminate in 24 days?";
}, 2147483647);

const files = (
  await readdir("dist/test", {
    recursive: true,
  })
).filter(
  file =>
    !file.endsWith(".map") &&
    !import.meta.url.endsWith(file)
);

type Result = Success | Failure;

type Success = Readonly<{
  type: "success";
  description: string;
}>;

type Failure = Readonly<{
  type: "failure";
  description: string;
  error: string;
}>;

const loadingChars = ["⠾", "⠷", "⠯", "⠟", "⠻", "⠽"];
const { version } = JSON.parse(
  await readFile("package.json", "utf-8")
);
console.log(`Running Odd v${version} test suite`);
let total = 0;
let done = 0;
const failures: Record<string, Failure[]> = {};
for (let line = 0; line < files.length; line++) {
  const file = files[line]!;
  const worker = new Worker("./dist/test/" + file);
  let loadingCharIndex = 0;
  let totalFile = 0;
  let doneFile = 0;
  let didFail = false;
  const interval = setInterval(() => {
    process.stdout.cursorTo(0, line + 1);
    process.stdout.write(
      loadingChars[
        loadingCharIndex++ % loadingChars.length
      ] +
        " " +
        file
    );
  }, 100);
  worker.on(
    "message",
    (payload: "register" | Result) => {
      if (payload === "register") {
        total += 1;
        totalFile += 1;
      } else {
        done += 1;
        doneFile += 1;

        if (payload.type === "failure") {
          didFail = true;
          (failures[file] ??= []).push(payload);
        }

        // TODO: Register errors to be displayed afterwards
        if (doneFile === totalFile) {
          clearInterval(interval);
          process.stdout.cursorTo(0, line + 1);
          process.stdout.clearLine(1);
          console.log(
            `${didFail ? "❌" : "✅"} ` + file
          );

          if (done === total) {
            process.stdout.cursorTo(
              0,
              files.length + 2
            );
            if (Object.keys(failures).length) {
              console.log(
                `Found ${
                  Object.values(failures).flat().length
                } issues in ${
                  Object.keys(failures).length
                } file(s):\n`
              );
            } else {
              console.log("Done! No issues found 😎");
            }
            for (const [
              file,
              issues,
            ] of Object.entries(failures)) {
              for (const issue of issues) {
                console.log(
                  `[${file}] ${issue.description}:\n${issue.error}\n`
                );
              }
            }
            // NOTE: Clearing the "busywork" to tell node it can stop the process
            clearTimeout(timeout);
          }
        }
      }
    }
  );
}
