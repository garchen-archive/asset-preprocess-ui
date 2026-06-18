// Version info injected at build time via next.config.js
export const version = {
  version: process.env.NEXT_PUBLIC_APP_VERSION || "dev",
  gitCommit: process.env.NEXT_PUBLIC_GIT_COMMIT || "unknown",
  buildTime: process.env.NEXT_PUBLIC_BUILD_TIME || "unknown",
};

export function getVersionString(): string {
  const short = version.gitCommit.substring(0, 7);
  if (version.version === "dev") {
    return `dev (${short})`;
  }
  return `v${version.version} (${short})`;
}
