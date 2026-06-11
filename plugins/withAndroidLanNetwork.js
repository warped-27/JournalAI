/**
 * Config plugin: allow plain HTTP on Android for LAN sync.
 *
 * Android 9+ blocks cleartext (HTTP) traffic by default.  LAN sync
 * communicates over HTTP to the desktop Axum server.  The bundle is
 * already AES-256-GCM encrypted at the application layer and protected
 * by a one-time PIN, so plain HTTP on the local network is acceptable.
 *
 * Android's network-security-config <domain> elements only accept
 * hostnames, not IP ranges — there is no way to whitelist RFC-1918
 * subnets without allowing cleartext globally.  We therefore set
 * android:usesCleartextTraffic="true" on the <application> tag.
 */
const { withAndroidManifest } = require('@expo/config-plugins');

function withAndroidLanNetwork(config) {
  return withAndroidManifest(config, (conf) => {
    const app = conf.modResults.manifest.application?.[0];
    if (app) {
      app.$['android:usesCleartextTraffic'] = 'true';
    }
    return conf;
  });
}

module.exports = withAndroidLanNetwork;
