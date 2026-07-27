import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
const pageSource = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
const gitignore = await readFile(new URL("../.gitignore", import.meta.url), "utf8");

assert.equal(packageJson.scripts.dev, "next build && next start");
assert.match(gitignore, /^\/data\/$/m);
assert.match(pageSource, /Load demo data/);
assert.doesNotMatch(pageSource, /Promise\.all\(seed\.map/);

console.log("Local setup checks passed");

