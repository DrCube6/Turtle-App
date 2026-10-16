// Expo config plugin: android:largeHeap="true" on the <application>.
//
// Low-end phones give each app a small Java heap (128 MB on the Galaxy A01
// used for testing). Google Maps needs large temporary allocations while it
// draws tiles, and with the app's normal ~50 MB that burst could exceed the
// limit and crash with OutOfMemoryError. largeHeap raises the limit to the
// device's large value (256 MB on that phone).
const { withAndroidManifest } = require('@expo/config-plugins');

module.exports = function withLargeHeap(config) {
  return withAndroidManifest(config, (cfg) => {
    const application = cfg.modResults.manifest.application?.[0];
    if (application) {
      application.$['android:largeHeap'] = 'true';
    }
    return cfg;
  });
};
