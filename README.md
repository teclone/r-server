# R-Server

R-Server is a lightweight, fully integrated [node.js](https://nodejs.org/en/docs/guides/anatomy-of-an-http-transaction/) web server, with inbuilt rest api routing engine, static file server, body parser including form-data and file upload handlers, middleware support, and lots more.

Despite being configurable for advanced usage, it requires no configurations to get it started. It is fully compatible with [express.js](https://expressjs.com/) and provides more functionalities out of the box without need for external plugins.

## Getting Started (NPM install)

```bash
npm install r-server --save-dev
```

Create a `server.js` file in your project root directory and write the following lines of code and save.

```javascript
let RServer = require('r-server');

let app = RServer.instance();

app.listen(8000);

app.get('/', (req, res) => {
    res.end('Hello World');
});
```

Start the server:

```bash
npm start
```

and navigate to `http://localhost:8000/` in your browser to view this mini web project.

**It is that simple!!!**.

## Why R-Server

R-Server gives you many cutting edge, excellent features out of the box, saving you the stress of looking for external plugins and third party solutions. These includes:

### Excellent Request Body Parser

R-Server gives you excellent control over request body parsing, with ability to handle urlencoded, json encoded and multipart form-data including file uploads out of the box, requiring no overhead trying to use an external plugin. Multi-value form fields are supported and should be named using [PHP-like](http://php.net/manual/en/tutorial.forms.php) ending bracket notations. e.g `slct-countries[]`, `file-documents[]`.

Processed request data are made availabe through `request.body`, files through `request.files`, query parameters through `request.query` . There is a `request.data` that is a combination of `body` and `query` with values in body winning the battle in case of conflicting keys.

```javascript
app.post('user/create', (req, res) => {
    let name = req.body.name,
    password = req.body.password,

    cvDetails = {
        filename: req.files.cv.fileName,
        filesize: req.files.cv.size,
        mimetype: req.files.cv.mimeType,
        path: req.files.cv.path,
        tempName: req.files.cv.tempName,
    };

    //move the file from temporary path to somewhere save

    res.end('Great, user created');
});
```

### Excellent Routing Engine

It provides an excellent routing engine, with parameter capturing including data type enforcement on captured parameters. All http methods verbs are made available for routing including `get`, `post`, `put`, `delete`, `options`, `head` and the universal `all` method.

Unlike express, parameter capturing sections are enclosed in *curly braces {}*  and you are not prevented from using hyphen in your parameter names.

```javascript
app.route('user/{user-id}/profile', (req, res, id) => {
    id = /^\d+$/.test(id)? Number.parseInt(id) : 0;

    if (id !== 0)
        res.end('<h1>Your profile is not ready yet');
    else
        res.end('<h1>Invalid user id found</h1>');
});

//instead of doing the above, you can type hint the parameter data type
app.route('user/{int:user-id}/profile', (req, res, id) => {
    //id is already an integer. NaN equals 0
    if (id !== 0)
        res.end('<h1>Your profile is not ready yet');
    else
        res.end('<h1>Invalid user id found</h1>');
});
```

### Excellent Static File Server

It provides static file services out of the box, responding to `GET`, `HEAD`, & `OPTIONS` requests made of such files. By default, it serves files from the project's root directory and also from the `./public` folder. *It does not serve config files (files that starts with dot `.`)*.

It uses node.js inbuilt [writable & readable stream API](https://nodejs.org/api/stream.html#stream_class_stream_writable) while serving files for performance gain, user experience and minimal usage of system resources.

It provides excellent content negotiation [headers](https://www.w3.org/Protocols/rfc2616/rfc2616-sec14.html) (`Cache-Control`, `ETag` & `Last-Modified` headers) and would negotiate contents by checking for the presence of the  `if-none-match` & `if-modified-since` http request headers.