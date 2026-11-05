#!/usr/bin/env node
// prisma CLI（本番デプロイの migrate deploy 用）が実行時に必要とするパッケージを
// node_modules から依存関係をたどって集め、出力先へ同じ階層構造でコピーする。
//
// 本番イメージは standalone 出力の最小限の node_modules しか持たない。prisma の CLI が
// 必要とする間接依存（6.19 で effect, c12, empathic など約30個）を Dockerfile に手書きすると
// 更新のたびに漏れて、デプロイ時に migration が起動できなくなる（#381）。
//
// 使い方: node scripts/collect-prisma-cli-deps.js <node_modules> <出力先 node_modules> [起点パッケージ=prisma]

import fs from "node:fs";
import path from "node:path";

const [, , rootArg, outArg, entryArg] = process.argv;
if (!rootArg || !outArg) {
  console.error("usage: collect-prisma-cli-deps.js <node_modules> <out node_modules> [package]");
  process.exit(2);
}

const root = path.resolve(rootArg);
const out = path.resolve(outArg);
const entry = entryArg || "prisma";
// Node の解決はここより上へは探しに行かない（/app/node_modules の親 = /app）。
const stopDir = path.dirname(root);

// 依存を要求したパッケージのディレクトリから上に向かって node_modules/<name> を探す（Node の解決順）。
function resolvePackageDir(name, fromDir) {
  let dir = fromDir;
  for (;;) {
    if (path.basename(dir) !== "node_modules") {
      const candidate = path.join(dir, "node_modules", name);
      if (fs.existsSync(path.join(candidate, "package.json"))) return candidate;
    }
    if (dir === stopDir) return null;
    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

const entryDir = resolvePackageDir(entry, stopDir);
if (!entryDir) {
  console.error(`package not found under ${root}: ${entry}`);
  process.exit(1);
}

const visited = new Set();
const queue = [entryDir];
while (queue.length > 0) {
  const dir = queue.shift();
  if (visited.has(dir)) continue;
  visited.add(dir);

  const pkg = JSON.parse(fs.readFileSync(path.join(dir, "package.json"), "utf8"));
  const dest = path.join(out, path.relative(root, dir));
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.cpSync(dir, dest, { recursive: true });

  const optional = new Set(Object.keys(pkg.optionalDependencies ?? {}));
  const deps = { ...(pkg.dependencies ?? {}), ...(pkg.optionalDependencies ?? {}) };
  for (const name of Object.keys(deps)) {
    const depDir = resolvePackageDir(name, dir);
    if (depDir) {
      queue.push(depDir);
    } else if (!optional.has(name)) {
      console.error(`dependency not found: ${name} (required by ${pkg.name}@${pkg.version})`);
      process.exit(1);
    }
  }
}

console.log(`collected ${visited.size} packages for ${entry} into ${out}`);
