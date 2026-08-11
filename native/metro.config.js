// Metro-Konfiguration, damit die geteilte UI-freie Engine aus ../src
// mitgebündelt wird (Spec §6.3: Engine als eigenständiges, portables Paket).
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const repoRoot = path.resolve(projectRoot, '..');

const config = getDefaultConfig(projectRoot);

// Den Repo-Wurzelordner beobachten, damit ../src auflösbar ist.
config.watchFolders = [repoRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(repoRoot, 'node_modules'),
];

module.exports = config;
