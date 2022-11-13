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
    if (err) {
      reject(err);
    } else {
      process.stdout.write(stdout + "\n");
      resolve();
    }
  });

  return promise;
};

for (const file of (await readdir("dist/test")).filter(
  file =>
    file !==
    import.meta.url.slice(
      import.meta.url.lastIndexOf("/") + 1
    )
))
  await run(file);
