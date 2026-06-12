const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Allow Metro to serve .wasm files as static assets (needed by expo-sqlite on web)
config.resolver.assetExts.push('wasm');

// Exclude Rust build artifacts from Metro's file watcher to prevent ENOENT
// crashes caused by temp files created/deleted during cargo compilation.
config.watchFolders = (config.watchFolders ?? []).filter(
  (f) => !f.includes('src-tauri')
);
config.resolver.blockList = [
  ...(Array.isArray(config.resolver.blockList) ? config.resolver.blockList : []),
  new RegExp(path.join(__dirname, 'src-tauri', 'target').replace(/\\/g, '\\\\')),
];

module.exports = config;
