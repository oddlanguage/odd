import { exec } from "node:child_process";
import { readdir } from "node:fs/promises";

const run = (file: string) => {
  let resolve: Function;
  let reject: Function;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  console.log(`Running test/${file}`);
  exec(`node dist/test/${file}`, (err, stdout) => {
    process.stdout.write(stdout + "\n");

    if (err || stdout.includes("❌")) {
      reject(err);
    } else {
      resolve();
    }
  });

  return promise;
};

const files = (await readdir("dist/test")).filter(
  file =>
    file !==
    import.meta.url.slice(
      import.meta.url.lastIndexOf("/") + 1
    )
);

let succeeded = 0;
for (const file of files) {
  try {
    await run(file);
    succeeded += 1;
  } catch (_) {}
}

console.log(
  `${succeeded}/${files.length} test succeeded (${
    (succeeded / files.length) * 100
  }%)`
);
