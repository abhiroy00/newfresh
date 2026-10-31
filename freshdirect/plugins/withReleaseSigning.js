// Config plugin for building signed Play Store bundles outside EAS (GitHub Actions).
//
// - Adds signingConfigs.release to android/app/build.gradle. Values come from env vars
//   (KEYSTORE_PASSWORD, KEY_ALIAS, KEY_PASSWORD, optional KEYSTORE_FILE), falling back to
//   GMART_UPLOAD_* Gradle properties (e.g. in ~/.gradle/gradle.properties) for local builds.
//   If no keystore file exists, release builds keep using the debug key so local
//   `expo run:android --variant release` still works.
// - ANDROID_VERSION_CODE env overrides android.versionCode (CI sets it per run).
// - EXPO_UPDATES_CHANNEL env sets the expo-updates channel header (EAS Build normally does this).
// - Raises Gradle JVM memory: the template's 512 MiB metaspace runs out during release lint.
const { withAppBuildGradle, withGradleProperties } = require('expo/config-plugins');

const GRADLE_JVM_ARGS = '-Xmx4096m -XX:MaxMetaspaceSize=1024m';

const MARKER = '// @gmart/release-signing';

const KEYSTORE_DEF = `${MARKER}
def releaseKeystore = file(System.getenv("KEYSTORE_FILE") ?: (findProperty("GMART_UPLOAD_STORE_FILE") ?: "release.keystore"))
`;

const RELEASE_SIGNING = `
        release {
            if (releaseKeystore.exists()) {
                storeFile releaseKeystore
                storePassword System.getenv("KEYSTORE_PASSWORD") ?: findProperty("GMART_UPLOAD_STORE_PASSWORD")
                keyAlias System.getenv("KEY_ALIAS") ?: findProperty("GMART_UPLOAD_KEY_ALIAS")
                keyPassword System.getenv("KEY_PASSWORD") ?: findProperty("GMART_UPLOAD_KEY_PASSWORD")
            }
        }`;

function patchBuildGradle(src) {
  if (src.includes(MARKER)) return src;

  const releaseType = /(buildTypes\s*\{[\s\S]*?release\s*\{[^}]*?)signingConfig signingConfigs\.debug/;
  const signingConfigs = /signingConfigs\s*\{/;
  if (!releaseType.test(src) || !signingConfigs.test(src) || !/\nandroid\s*\{/.test(src)) {
    throw new Error('withReleaseSigning: android/app/build.gradle has an unexpected layout');
  }

  return src
    .replace(releaseType, '$1signingConfig releaseKeystore.exists() ? signingConfigs.release : signingConfigs.debug')
    .replace(signingConfigs, (m) => m + RELEASE_SIGNING)
    .replace(/\nandroid\s*\{/, (m) => `\n${KEYSTORE_DEF}${m}`);
}

module.exports = function withReleaseSigning(config) {
  const versionCode = process.env.ANDROID_VERSION_CODE;
  if (versionCode) {
    config.android = { ...config.android, versionCode: parseInt(versionCode, 10) };
  }

  const channel = process.env.EXPO_UPDATES_CHANNEL;
  if (channel) {
    config.updates = {
      ...config.updates,
      requestHeaders: { ...config.updates?.requestHeaders, 'expo-channel-name': channel },
    };
  }

  config = withGradleProperties(config, (cfg) => {
    const props = cfg.modResults.filter((p) => !(p.type === 'property' && p.key === 'org.gradle.jvmargs'));
    props.push({ type: 'property', key: 'org.gradle.jvmargs', value: GRADLE_JVM_ARGS });
    cfg.modResults = props;
    return cfg;
  });

  return withAppBuildGradle(config, (cfg) => {
    cfg.modResults.contents = patchBuildGradle(cfg.modResults.contents);
    return cfg;
  });
};
