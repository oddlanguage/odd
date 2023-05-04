import { exec } from "node:child_process";
import { readdir, stat } from "node:fs/promises";
import path from "node:path/posix";

const run = (file: string) => {
  // TODO: Show results in order
  // TODO: Don't check errors with ❌, that's dumb
  let resolve: Function;
  let reject: Function;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  const base = "/dist/test/";
  console.log(
    `Running ${file.slice(
      file.indexOf(base) + base.length
    )}`
  );
  exec(`node ${file}`, (err, stdout) => {
    process.stdout.write(stdout + "\n");

    if (err ?? stdout.includes("❌")) {
      reject(err ?? stdout);
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
        const fullPath = path.resolve(dir, file);
        return (await stat(fullPath)).isDirectory()
          ? await walk(fullPath, depth + 1)
          : fullPath;
      })
    )
  ).flat();
};

const files = (await walk("dist/test")).filter(
  file =>
    !import.meta.url.endsWith(file) &&
    !file.endsWith(".map")
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
