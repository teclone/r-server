let RServer = require('./lib/main.js');

let app = RServer.instance();

app.listen(); //listens on port 8131 by default

app.use(function(req, res, next) {
    next();
});

/**process form upload from our examples index.html file*/
app.post('process-upload', function(req, res) {

    res.writeHead(200, {'Content-Type': 'application/json'});

    let result = JSON.stringify(
        Object.assign({}, req.body, req.files)
    );

    //beautify json before sending
    res.end(require('js-beautify').js(result));
});

//send download
app.get('send-download', (req, res) => {
    res.download('package.json');
});