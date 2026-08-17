import { execFile as execFileCallback } from "node:child_process";
import { promisify } from "node:util";

const execFileDefault = promisify(execFileCallback);
const GITHUB_API = "https://api.github.com/repos";

export function normaliseReleaseVersion(value) {
  if (typeof value !== "string" || !/^v?[0-9][A-Za-z0-9._-]*$/.test(value)) throw new Error("version_release_tag_invalid");
  return value.startsWith("v") ? value.slice(1) : value;
}

function stableRelease(payload) {
  if (!payload || typeof payload !== "object" || payload.draft || payload.prerelease) throw new Error("version_release_prerelease");
  const tag = payload.tag_name;
  const publishedAt = payload.published_at;
  if (typeof publishedAt !== "string" || Number.isNaN(Date.parse(publishedAt))) throw new Error("version_release_published_at_invalid");
  return { tag, version: normaliseReleaseVersion(tag), publishedAt };
}

async function responseJson(response) {
  if (!response?.ok) throw new Error("version_release_unavailable");
  try { return await response.json(); } catch { throw new Error("version_release_malformed"); }
}

export async function resolveLatestStable({ repository, fetchImpl = fetch } = {}) {
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository ?? "")) throw new Error("version_repository_invalid");
  return stableRelease(await responseJson(await fetchImpl(`${GITHUB_API}/${repository}/releases/latest`, {
    headers: { Accept: "application/vnd.github+json" },
  })));
}

export async function readInstalledMuxyVersion({ appPath = process.env.MUXY_APP_PATH || "/Applications/Muxy.app", execFile = execFileDefault } = {}) {
  if (typeof appPath !== "string" || !appPath.endsWith(".app") || appPath.includes("\n")) throw new Error("version_muxy_app_path_invalid");
  const plist = `${appPath}/Contents/Info.plist`;
  const readField = async (field) => {
    try {
      const { stdout } = await execFile("plutil", ["-extract", field, "raw", "-o", "-", plist]);
      const value = stdout.trim();
      if (!value || value.includes("\n")) throw new Error("invalid");
      return value;
    } catch { throw new Error(`version_muxy_${field}_unreadable`); }
  };
  const [bundleIdentifier, shortVersion, buildVersion] = await Promise.all([
    readField("CFBundleIdentifier"), readField("CFBundleShortVersionString"), readField("CFBundleVersion"),
  ]);
  if (bundleIdentifier !== "com.muxy.app") throw new Error("version_muxy_bundle_identifier");
  if (!/^[0-9][A-Za-z0-9._-]*$/.test(shortVersion) || !/^[A-Za-z0-9._-]+$/.test(buildVersion)) throw new Error("version_muxy_value_invalid");
  return { bundleIdentifier, shortVersion, buildVersion };
}

export async function resolveHermesRevision({ fetchImpl = fetch } = {}) {
  const release = await resolveLatestStable({ repository: "NousResearch/hermes-agent", fetchImpl });
  const response = await fetchImpl(`${GITHUB_API}/NousResearch/hermes-agent/commits/${encodeURIComponent(release.tag)}`, {
    headers: { Accept: "application/vnd.github+json" },
  });
  const payload = await responseJson(response);
  if (typeof payload?.sha !== "string" || !/^[a-f0-9]{40}$/i.test(payload.sha)) throw new Error("version_hermes_revision_invalid");
  return { ...release, revision: payload.sha.toLowerCase() };
}

export async function resolveVersionTuple({ appPath, fetchImpl = fetch, execFile } = {}) {
  const [muxyRelease, muxyInstalled, hermesRelease] = await Promise.all([
    resolveLatestStable({ repository: "muxy-app/muxy", fetchImpl }),
    readInstalledMuxyVersion({ appPath, execFile }),
    resolveHermesRevision({ fetchImpl }),
  ]);
  if (normaliseReleaseVersion(muxyInstalled.shortVersion) !== muxyRelease.version) throw new Error("version_muxy_installed_mismatch");
  return {
    resolvedAt: new Date().toISOString(),
    muxyRelease: muxyRelease.tag,
    muxyInstalledVersion: muxyInstalled.shortVersion,
    muxyBuild: muxyInstalled.buildVersion,
    hermesRelease: hermesRelease.tag,
    hermesVersion: hermesRelease.version,
    hermesRevision: hermesRelease.revision,
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    process.stdout.write(`${JSON.stringify(await resolveVersionTuple())}\n`);
  } catch (error) {
    process.stderr.write(`${/^version_/.test(error?.message ?? "") ? error.message : "version_resolution_failed"}\n`);
    process.exitCode = 1;
  }
}
