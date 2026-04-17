/**
 * Expo config plugin: copies Mesher BLE native sources (Android Kotlin + iOS Swift/ObjC),
 * registers MesherBlePackage in MainApplication, adds FGS service + permissions to the manifest,
 * and adds iOS sources to the Xcode project.
 * Canonical sources live under plugins/mesher-ble-native/.
 */
const {
  AndroidConfig,
  createRunOncePlugin,
  IOSConfig,
  withAndroidManifest,
  withDangerousMod,
  withMainApplication,
} = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

function iosAppFolderName(config) {
  const n = config.name || "App";
  return n.replace(/[\W_]+/g, "") || "App";
}

function withMesherBleAndroidManifest(config) {
  return withAndroidManifest(config, (c) => {
    const androidManifest = c.modResults;
    const app = AndroidConfig.Manifest.getMainApplicationOrThrow(androidManifest);
    if (!app.service) {
      app.service = [];
    }
    const svcName = ".MeshRelayForegroundService";
    const has = app.service.some((s) => {
      const n = s.$["android:name"];
      return n === svcName || n === "com.sebhdz.mesher.MeshRelayForegroundService";
    });
    if (!has) {
      app.service.push({
        $: {
          "android:name": svcName,
          "android:exported": "false",
          "android:foregroundServiceType": "connectedDevice",
        },
      });
    }
    const { manifest } = androidManifest;
    if (!manifest["uses-permission"]) {
      manifest["uses-permission"] = [];
    }
    const extraPerms = [
      "android.permission.FOREGROUND_SERVICE",
      "android.permission.FOREGROUND_SERVICE_CONNECTED_DEVICE",
      "android.permission.POST_NOTIFICATIONS",
    ];
    for (const name of extraPerms) {
      const dup = manifest["uses-permission"].some((p) => p.$["android:name"] === name);
      if (!dup) {
        manifest["uses-permission"].push({ $: { "android:name": name } });
      }
    }
    return c;
  });
}

function withMesherBle(config) {
  config = withMesherBleAndroidManifest(config);

  config = withDangerousMod(config, [
    "android",
    async (c) => {
      const projectRoot = c.modRequest.projectRoot;
      const androidRoot = path.join(projectRoot, "android");
      if (!fs.existsSync(androidRoot)) {
        return c;
      }
      const srcDir = path.join(projectRoot, "plugins", "mesher-ble-native", "android");
      const destDir = path.join(
        androidRoot,
        "app",
        "src",
        "main",
        "java",
        "com",
        "sebhdz",
        "mesher",
      );
      fs.mkdirSync(destDir, { recursive: true });
      for (const f of [
        "MesherBleModule.kt",
        "MesherBlePackage.kt",
        "MeshRelayForegroundService.kt",
      ]) {
        const from = path.join(srcDir, f);
        const to = path.join(destDir, f);
        if (fs.existsSync(from)) {
          fs.copyFileSync(from, to);
        }
      }
      return c;
    },
  ]);

  config = withMainApplication(config, (c) => {
    let contents = c.modResults.contents;
    if (contents.includes("MesherBlePackage()")) {
      return c;
    }
    const needle = "PackageList(this).packages.apply {";
    if (!contents.includes(needle)) {
      return c;
    }
    c.modResults.contents = contents.replace(
      needle,
      `${needle}\n              add(MesherBlePackage())`,
    );
    return c;
  });

  config = withDangerousMod(config, [
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
      const srcDir = path.join(projectRoot, "plugins", "mesher-ble-native", "ios");
      for (const f of ["MesherBleNative.swift", "MesherBleNative.m"]) {
        const from = path.join(srcDir, f);
        const to = path.join(targetDir, f);
        if (fs.existsSync(from)) {
          fs.copyFileSync(from, to);
        }
      }

      const projPath = IOSConfig.Paths.getPBXProjectPath(projectRoot);
      const proj = IOSConfig.XcodeUtils.getPbxproj(projectRoot);
      IOSConfig.XcodeUtils.ensureGroupRecursively(proj, folder);
      IOSConfig.XcodeUtils.addBuildSourceFileToGroup({
        filepath: `${folder}/MesherBleNative.swift`,
        groupName: folder,
        project: proj,
      });
      IOSConfig.XcodeUtils.addBuildSourceFileToGroup({
        filepath: `${folder}/MesherBleNative.m`,
        groupName: folder,
        project: proj,
      });
      fs.writeFileSync(projPath, proj.writeSync());
      return c;
    },
  ]);

  return config;
}

module.exports = createRunOncePlugin(withMesherBle, "mesher-ble-native");
