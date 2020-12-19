const { resolve } = require('path');

process.env.THEIA_DEFAULT_PLUGINS = `local-dir:${resolve(__dirname, '..', 'plugins')}`;
require('../src-gen/frontend/electron-main');
