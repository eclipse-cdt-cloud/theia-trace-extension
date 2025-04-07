/**
 * This file can be edited to customize webpack configuration.
 * To reset delete this file and rerun theia build again.
 */
// @ts-check
const configs = require('./gen-webpack.config.js');
const nodeConfig = require('./gen-webpack.node.config.js');
const webpack = require("webpack");

/**
 * Expose bundled modules on window.theia.moduleName namespace, e.g.
 * window['theia']['@theia/core/lib/common/uri'].
 * Such syntax can be used by external code, for instance, for testing.
configs[0].module.rules.push({
    test: /\.js$/,
    loader: require.resolve('@theia/application-manager/lib/expose-loader')
}); */

// necessary for "time range" context menu to work at runtime. This is due to 
// dependency react-contexify, that expects to see environment variable 
// "NODE_ENV" defined. See:
// https://github.com/eclipse-cdt-cloud/theia-trace-extension/issues/1066#issuecomment-2045774804
configs[0].plugins.push(new webpack.DefinePlugin({
    'process.env': {
      NODE_ENV: JSON.stringify(process.env.NODE_ENV || 'development')
    }
  }));

module.exports = [
  ...configs,
  nodeConfig.config
];