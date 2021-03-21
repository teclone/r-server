#!/usr/bin/env node
const args = require('args');
const { App } = require('../lib');

const serveScriptOptions = (module.exports.serveScriptOptions = [
  {
    name: 'port',
    description: 'the port on which the server will be running',
  },
  {
    name: 'env',
    description:
      'The environment the server will be running on. either prod or dev. defaults to dev',
    defaultValue: 'dev',
  },
]);

args.options(serveScriptOptions);

const run = () => {
  const { port, ...config } = args.parse(process.argv);

  const server = new App({
    config,
  });

  return server.listen(port);
};

run();
