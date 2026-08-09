const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const root = path.resolve(__dirname, '..', '..');
const projectRoot = __dirname;

const config = getDefaultConfig(projectRoot);

// Include the workspace packages so Metro can resolve them
config.watchFolders = [path.join(root, 'packages')];

// Redirect node modules resolution to the repository root node_modules
config.resolver = {
  ...config.resolver,
  extraNodeModules: new Proxy({}, {
    get: (_, name) => path.join(root, 'node_modules', name)
  })
};

module.exports = config;
