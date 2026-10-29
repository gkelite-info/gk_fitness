const { withAppBuildGradle, withMainApplication, createRunOncePlugin } = require('@expo/config-plugins');

const withWatchBridgeGradle = (config) => {
  return withAppBuildGradle(config, (gradleConfig) => {
    let contents = gradleConfig.modResults.contents;
    if (!contents.includes('play-services-wearable')) {
      const depString = `
    // Google Play Services Wearable Data Layer API for Smartwatch sync
    implementation("com.google.android.gms:play-services-wearable:18.2.0")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-play-services:1.8.1")
`;
      contents = contents.replace(/dependencies\s*\{/, `dependencies {${depString}`);
      gradleConfig.modResults.contents = contents;
    }
    return gradleConfig;
  });
};

const withWatchBridgeMainApplication = (config) => {
  return withMainApplication(config, (mainAppConfig) => {
    let contents = mainAppConfig.modResults.contents;

    // 1. Ensure import is present
    if (!contents.includes('import com.gkeliteinfo.gkgymlife.watch.WatchBridgePackage')) {
      contents = contents.replace(
        /package com\.gkeliteinfo\.gkgymlife/,
        `package com.gkeliteinfo.gkgymlife\n\nimport com.gkeliteinfo.gkgymlife.watch.WatchBridgePackage`
      );
    }

    // 2. Ensure package is registered
    if (!contents.includes('WatchBridgePackage()')) {
      contents = contents.replace(
        /PackageList\(this\)\.packages\.apply\s*\{/,
        `PackageList(this).packages.apply {\n          add(WatchBridgePackage())`
      );
    }

    mainAppConfig.modResults.contents = contents;
    return mainAppConfig;
  });
};

const withWatchBridge = (config) => {
  config = withWatchBridgeGradle(config);
  config = withWatchBridgeMainApplication(config);
  return config;
};

module.exports = createRunOncePlugin(withWatchBridge, 'withWatchBridge', '1.0.0');
