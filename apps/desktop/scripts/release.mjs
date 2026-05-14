import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/**
export APPLE_API_KEY="/Downloads/AuthKey_XXXXXXXXXX.p8"
export APPLE_API_KEY_ID="XXXXXXXXXX"
export APPLE_API_ISSUER="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
*/

const target = process.argv[2];
if (target !== "win" && target !== "mac") {
  console.error("Usage: node scripts/release.mjs <win|mac>");
  process.exit(1);
}

const desktopDir = resolve(fileURLToPath(new URL("..", import.meta.url)));
const desktopPackagePath = join(desktopDir, "package.json");
const desktopPackage = JSON.parse(readFileSync(desktopPackagePath, "utf8"));
const tag = `v${desktopPackage.version}`;
const releaseTitle = tag;
const releaseNotes = `Jam desktop ${tag}`;

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: desktopDir,
    stdio: "inherit",
    ...options,
  });
  if (result.error) {
    console.error(result.error.message);
    process.exit(1);
  }
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function probe(command, args) {
  return (
    spawnSync(command, args, {
      cwd: desktopDir,
      stdio: "ignore",
    }).status === 0
  );
}

function commandName(command) {
  if (process.platform !== "win32") {
    return command;
  }
  if (command === "npm") {
    return "npm.cmd";
  }
  if (command === "gh") {
    const githubCliPath = join(
      process.env.ProgramFiles ?? "C:\\Program Files",
      "GitHub CLI",
      "gh.exe",
    );
    if (existsSync(githubCliPath)) {
      return githubCliPath;
    }
  }
  return command;
}

function listArtifacts() {
  const distDir = join(desktopDir, "dist");
  return readdirSync(distDir)
    .map((name) => join(distDir, name))
    .filter((path) => statSync(path).isFile())
    .filter((path) => {
      const lower = path.toLowerCase();
      return (
        lower.endsWith(".exe") ||
        lower.endsWith(".dmg") ||
        lower.endsWith(".zip") ||
        lower.endsWith(".blockmap") ||
        lower.endsWith(".yml") ||
        lower.endsWith(".yaml")
      );
    });
}

run(commandName("npm"), ["run", `dist:${target}`], {
  shell: process.platform === "win32",
});

const artifacts = listArtifacts();
if (artifacts.length === 0) {
  console.error("No release artifacts found in apps/desktop/dist.");
  process.exit(1);
}

const releaseExists = probe(commandName("gh"), ["release", "view", tag]);

if (releaseExists) {
  run(commandName("gh"), ["release", "upload", tag, ...artifacts, "--clobber"]);
} else {
  run(commandName("gh"), [
    "release",
    "create",
    tag,
    ...artifacts,
    "--title",
    releaseTitle,
    "--notes",
    releaseNotes,
  ]);
}

console.log(`Published ${artifacts.length} artifact(s) to ${tag}.`);
