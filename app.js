require('source-map-support').install();
const jsBeautify = require('js-beautify');

const RServer = require('./lib/main');
const app = RServer.create();

// process form upload from our examples index.html file
app.post('/', function(req, res) {
    const result = JSON.stringify(Object.assign({}, req.body, req.files));
    return res.json(jsBeautify.js(result));
});

//send download
app.get('/download', (req, res) => {
    return res.download('media/image.jpg');
});

app.listen();