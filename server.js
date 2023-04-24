const jsBeautify = require('js-beautify');

const { Server } = require('./build/cjs');
const server = new Server();

// process form upload from our examples index.html file
server.post('/', function (req, res) {
  const result = JSON.stringify(Object.assign({}, req.body, req.files));
  return res.json(jsBeautify.js(result));
});

//send download
server.get('/download', (req, res) => {
  return res.download('media/image.jpg');
});

module.exports = server;
