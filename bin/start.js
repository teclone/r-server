#!/usr/bin/env node
const { getEntryPath } = require('@teclone/node-utils');
const args = require('args');
const { App } = require('../lib');
const { resolve } = require('path');
const { statSync } = require('fs');

const startScriptOptions = (module.exports.startScriptOptions = [
  {
    name: 'port',
    description: 'the port on which the server will be running',
  },
  {
    name: 'entry',
    description:
      'relative path to the entry file containing your app/server export, defaults to app.js',
    defaultValue: 'app.js',
  },
]);

args.options(startScriptOptions);

const run = () => {
  const { port, entry, ...config } = args.parse(process.argv);
  const entryPath = getEntryPath();

  const entryFilePath = resolve(entryPath, entry);

  try {
    const stats = statSync(entryFilePath);
    if (stats.isFile()) {
      const app = require(entryFilePath);
      app.listen(port);
    }
  } catch (ex) {
    console.log(ex);
  }
};

run();
