#!/usr/bin/env node
const { Server, config } = require('./cliOptions');

const run = () => {
  const server = new Server({
    config,
  });
  return server.listen();
};

run();
