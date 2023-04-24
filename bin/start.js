#!/usr/bin/env node
const { entryFile, port } = require('./cliOptions');
const { resolve } = require('path');

const run = () => {
  const startFile = resolve(process.cwd(), entryFile);
  let server;

  try {
    server = require(startFile);
  } catch (ex) {
    console.error('Error, could not locate server start file', ex);
    return;
  }

  return server.listen({ httpPort: port });
};

run();
