// Extends app.json with the Google Maps API keys, read from the environment
// so they stay out of git:
//   - local builds: put them in .env.local (gitignored)
//   - EAS cloud builds: add them as EAS environment variables
const androidKey = process.env.GOOGLE_MAPS_ANDROID_API_KEY;
const iosKey = process.env.GOOGLE_MAPS_IOS_API_KEY;

if (!androidKey) {
  console.warn(
    'GOOGLE_MAPS_ANDROID_API_KEY is not set - the Android map will show no tiles.'
  );
}

module.exports = ({ config }) => ({
  ...config,
  android: {
    ...config.android,
    config: {
      ...config.android?.config,
      googleMaps: { apiKey: androidKey },
    },
  },
  ios: {
    ...config.ios,
    config: {
      ...config.ios?.config,
      // Optional: without it, iOS falls back to Apple Maps (see SensorMap)
      ...(iosKey ? { googleMapsApiKey: iosKey } : {}),
    },
  },
});
