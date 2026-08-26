const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

/** @type {import('expo/metro-config').MetroConfig} */

const config = getDefaultConfig(__dirname);

config.resolver.unstable_enablePackageExports = true;

// Ensure video files and gifs are treated as assets by the bundler
if (!config.resolver.assetExts.includes('mp4')) {
  config.resolver.assetExts.push('mp4');
}
if (!config.resolver.assetExts.includes('gif')) {
  config.resolver.assetExts.push('gif');
}

module.exports = withNativeWind(config, { input: './global.css', inlineRem: 16 });
