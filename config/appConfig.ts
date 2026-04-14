import Constants from 'expo-constants';

const extra = (Constants.expoConfig?.extra ?? {}) as { loginUrl?: string };

export const APP_CONFIG = {
  loginUrl:
    extra.loginUrl ||
    'https://fostur.dev/app/api/index.php?route=loginSensor',
  defaults: {
    targetName: 'Turtle-MC',
    sampleRateMin: 60,
    wifiSsid: 'University Trails',
    wifiPass: '1Eggshell-Tetra4',
    scanTimeoutMs: 15000,
    initialWriteDelayMs: 350,
    writeRetryDelayMs: 400,
    maxWriteAttempts: 4,
    postWriteWaitMs: 1200,
  },
  uuids: {
    service: '12345678-1234-5678-1234-56789abc0001',
    configCharacteristic: '12345678-1234-5678-1234-56789abc0002',
    statusCharacteristic: '12345678-1234-5678-1234-56789abc0003',
  },
};
