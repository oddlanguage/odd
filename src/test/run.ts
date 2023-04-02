import { exec } from "node:child_process";
import { readdir, stat } from "node:fs/promises";
import path from "node:path";

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

const walk = async (
  dir: string,
  depth = 0
): Promise<ReadonlyArray<string>> => {
  if (depth > 100)
    throw `Maximum walk depth exceeded.`;
  return (
    await Promise.all(
      (
        await readdir(dir)
      ).map(async file => {
        const fullPath = path.posix.resolve(dir, file);
        return (await stat(fullPath)).isDirectory()
          ? await walk(fullPath, depth + 1)
          : fullPath;
      })
    )
  ).flat();
};

const files = (await walk("dist/test")).filter(
  file => !import.meta.url.endsWith(file)
);

let succeeded = 0;
for (const file of files) {
  try {
    await run(file);
    succeeded += 1;
  } catch (_) {}
}

console.log(
  `${succeeded}/${
    files.length
  } test succeeded (${Math.round(
    (succeeded / files.length) * 100
  )}%)`
);
