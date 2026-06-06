const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Allow Metro to serve .wasm files as static assets (needed by expo-sqlite on web)
config.resolver.assetExts.push('wasm');

module.exports = config;
