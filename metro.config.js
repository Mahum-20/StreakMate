const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

config.resolver.sourceExts.push('cjs');

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === '@firebase/app') {
    return {
      filePath: path.resolve(__dirname, 'node_modules/@firebase/app/dist/index.cjs.js'),
      type: 'sourceFile',
    };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
