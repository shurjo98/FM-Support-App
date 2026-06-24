// Apple Silicon (arm64) refuses to run a Mach-O binary with zero code
// signature at all — this is a kernel-level requirement, separate from
// Gatekeeper/quarantine, and is why an unsigned build shows "is damaged and
// can't be opened" instead of the milder "unidentified developer" prompt.
// We don't have a paid Apple Developer ID yet, so force a free ad-hoc
// signature here regardless of whether electron-builder's own signing step
// found a real identity (it won't, since none is configured).
const { execSync } = require("child_process");

module.exports = async function afterSign(context) {
  if (context.electronPlatformName !== "darwin") return;

  const appName = context.packager.appInfo.productFilename;
  const appPath = `${context.appOutDir}/${appName}.app`;

  // codesign refuses to sign if any file under the bundle carries extended
  // attributes (resource forks, Finder info, quarantine flags, etc.) —
  // strip them first, then ad-hoc sign.
  execSync(`xattr -cr "${appPath}"`, { stdio: "inherit" });
  execSync(`codesign --force --deep --sign - "${appPath}"`, { stdio: "inherit" });
};
