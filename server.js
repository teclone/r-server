const jsBeautify = require('js-beautify');

const { Server } = require('./build/cjs');
const { writeFileSync } = require('fs');
const server = new Server();

// process form upload from our examples index.html file
server.post('/', function (req, res) {
  const result = JSON.stringify(req.data, (key, value) => {
    if (Buffer.isBuffer(value)) {
      return undefined;
    }
    return value;
  });

  writeFileSync('./upload.pdf', req.data['file-cv'].data);
  return res.json(jsBeautify.js(result));
});

//send download
server.get('/download', (req, res) => {
  return res.download('media/image.jpg');
});

module.exports = server;
