/**
 * Expo config plugin: copies Mesher Siri / App Intents native sources,
 * registers them in the Xcode project, adds App Group entitlement,
 * NSSiriUsageDescription, and ensures the mesher:// URL scheme.
 * Canonical sources live under plugins/mesher-siri-native/.
 */
const {
  createRunOncePlugin,
  IOSConfig,
  withDangerousMod,
  withEntitlementsPlist,
  withInfoPlist,
} = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

const APP_GROUP_ID = "group.com.sebhdz.mesher";

const IOS_SOURCE_FILES = [
  "MesherSiriStorage.swift",
  "MesherSiriContacts.swift",
  "SendMesherMessageIntent.swift",
  "ScheduleMesherMessageIntent.swift",
  "OpenMesherComposeIntent.swift",
  "MesherSiriShortcuts.swift",
  "MesherSiriBridge.swift",
  "MesherSiriBridge.m",
];

function iosAppFolderName(config) {
  const n = config.name || "App";
  return n.replace(/[\W_]+/g, "") || "App";
}

function withMesherSiriEntitlements(config) {
  return withEntitlementsPlist(config, (c) => {
    const key = "com.apple.security.application-groups";
    const existing = c.modResults[key];
    const groups = Array.isArray(existing) ? [...existing] : [];
    if (!groups.includes(APP_GROUP_ID)) {
      groups.push(APP_GROUP_ID);
    }
    c.modResults[key] = groups;
    return c;
  });
}

function withMesherSiriInfoPlist(config) {
  return withInfoPlist(config, (c) => {
    if (!c.modResults.NSSiriUsageDescription) {
      c.modResults.NSSiriUsageDescription =
        "Mesher uses Siri so you can send mesh messages by voice when you are offline.";
    }
    return c;
  });
}

function withMesherSiriIosSources(config) {
  return withDangerousMod(config, [
    "ios",
    async (c) => {
      const projectRoot = c.modRequest.projectRoot;
      const iosRoot = path.join(projectRoot, "ios");
      if (!fs.existsSync(iosRoot)) {
        return c;
      }
      const folder = iosAppFolderName(c);
      const targetDir = path.join(iosRoot, folder);
      fs.mkdirSync(targetDir, { recursive: true });
      const srcDir = path.join(projectRoot, "plugins", "mesher-siri-native", "ios");
      for (const f of IOS_SOURCE_FILES) {
        const from = path.join(srcDir, f);
        const to = path.join(targetDir, f);
        if (fs.existsSync(from)) {
          fs.copyFileSync(from, to);
        }
      }

      const projPath = IOSConfig.Paths.getPBXProjectPath(projectRoot);
      const proj = IOSConfig.XcodeUtils.getPbxproj(projectRoot);
      IOSConfig.XcodeUtils.ensureGroupRecursively(proj, folder);
      for (const f of IOS_SOURCE_FILES) {
        IOSConfig.XcodeUtils.addBuildSourceFileToGroup({
          filepath: `${folder}/${f}`,
          groupName: folder,
          project: proj,
        });
      }
      fs.writeFileSync(projPath, proj.writeSync());
      return c;
    },
  ]);
}

function withMesherSiri(config) {
  if (!config.scheme) {
    config.scheme = "mesher";
  }
  config = withMesherSiriEntitlements(config);
  config = withMesherSiriInfoPlist(config);
  config = withMesherSiriIosSources(config);
  return config;
}

module.exports = createRunOncePlugin(withMesherSiri, "mesher-siri-native");
