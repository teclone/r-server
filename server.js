let RServer = require('./lib/main.js');

let app = RServer.instance();

app.use(function(req, res, next) {
    next();
});

/**process form upload from our examples index.html file*/
app.post('process-upload', function(req, res) {
    let result = JSON.stringify(
        Object.assign(
            {},
            req.body,
            req.files
        )
    );
    res.json(require('js-beautify').js(result));
});

//send download
app.get('send-download', (req, res) => {
    res.download('package.json');
});

app.listen(); //listens on port 4000 by default