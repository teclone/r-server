const args = require('args');

const serveScriptOptions = (module.exports.serveScriptOptions = [
  {
    name: 'port',
    description: 'the port on which the server will be running',
    defaultValue: 8000,
  },
  {
    name: 'env',
    description:
      'The environment the server will be running on. either production or development',
    defaultValue: 'development',
  },
  {
    name: 'entryFile',
    description:
      'relative path to the entry file containing your app/server export, defaults to server.js',
    defaultValue: 'server.js',
  },
  {
    name: 'configFile',
    description:
      'relative path server configuration file, defaults to .server.config.js file',
    defaultValue: '.server.config.js',
  },
]);

args.options(serveScriptOptions);

const { port, env, entryFile, configFile } = args.parse(process.argv);

process.env.NODE_ENV = env;

if (process.env.NODE_ENV === 'development') {
  require('source-map-support').install();
}

const { Server } = require('../build/cjs');

module.exports = {
  entryFile,
  config: {
    port,
    configFile,
  },
  Server,
};
