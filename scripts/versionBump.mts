// Sets this branch's package.json version to one above main's, so each PR
// merged to main raises it. The PR title picks the step: "BREAKING CHANGE"
// bumps the major, "feat:" the minor, anything else the patch. It only ever
// raises the version, so a higher one set by hand is kept.
// Run by .github/workflows/version-bump.yml; locally:
//   PR_TITLE="feat: x" node scripts/versionBump.mts
import { appendFileSync, readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

const BASE_REF = process.env.BASE_REF ?? "origin/main";
const TITLE = process.env.PR_TITLE ?? "";
const VERSION_LINE = /^(\s*"version":\s*")([^"]+)(")/m;

const parse = (version: string) => {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version);
  if (!match) throw new Error(`Not a version: ${version}`);
  return [Number(match[1]), Number(match[2]), Number(match[3])] as const;
};

const compare = (a: string, b: string) => {
  const [x, y] = [parse(a), parse(b)];
  return x[0] - y[0] || x[1] - y[1] || x[2] - y[2];
};

const bump = (version: string) => {
  const [major, minor, patch] = parse(version);
  if (TITLE.includes("BREAKING CHANGE")) return `${String(major + 1)}.0.0`;
  if (TITLE.includes("feat:")) return `${String(major)}.${String(minor + 1)}.0`;
  return `${String(major)}.${String(minor)}.${String(patch + 1)}`;
};

const readVersion = (json: string) => {
  const match = VERSION_LINE.exec(json);
  if (!match?.[2]) throw new Error("package.json has no version");
  return match[2];
};

const baseVersion = readVersion(
  execFileSync("git", ["show", `${BASE_REF}:package.json`], {
    encoding: "utf8",
  }),
);
const packageJson = readFileSync("package.json", "utf8");
const current = readVersion(packageJson);
const target = bump(baseVersion);
const changed = compare(current, target) < 0;
const version = changed ? target : current;

// Only the version line changes, so the file keeps Prettier's formatting.
if (changed)
  writeFileSync(
    "package.json",
    packageJson.replace(VERSION_LINE, `$1${version}$3`),
  );

console.log(
  `main: ${baseVersion}, branch: ${current}, ` +
    (changed ? `bumped to ${version}` : "already up to date"),
);
if (process.env.GITHUB_OUTPUT)
  appendFileSync(
    process.env.GITHUB_OUTPUT,
    `changed=${String(changed)}\nversion=${version}\n`,
  );
