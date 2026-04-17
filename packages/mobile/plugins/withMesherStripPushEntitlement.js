/**
 * Expo config plugin: removes the `aps-environment` entitlement that
 * `expo-notifications` adds by default on iOS.
 *
 * Mesher only schedules **local** notifications (no APNs / remote push). Keeping
 * `aps-environment` forces the Push Notifications capability and breaks signing
 * with Apple **Personal Team** (free developer accounts).
 *
 * In `app.json`, list this plugin **before** `expo-notifications`. Expo chains
 * entitlements mods so the last-listed plugin runs first and `nextMod` runs
 * after; expo would re-add `aps-environment` if strip ran before expo in the
 * chain. Order: strip → expo-notifications → … so expo runs first, then strip
 * removes `aps-environment` from the merged plist.
 */
const { withEntitlementsPlist } = require("@expo/config-plugins");

function withMesherStripPushEntitlement(config) {
  return withEntitlementsPlist(config, (config) => {
    delete config.modResults["aps-environment"];
    return config;
  });
}

module.exports = withMesherStripPushEntitlement;
