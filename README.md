# R-Server

R-Server is a lightweight, fully integrated [node.js](https://nodejs.org/en/docs/guides/anatomy-of-an-http-transaction/) web server, with inbuilt routing engine, static file server, body parser including form-data and file upload handlers, middleware support, request-response profiler, and lots more.

Despite being configurable for advanced usage, it requires no configurations to get it started. It is fully compatible with [express.js](https://expressjs.com/) and provides more functionalities out of the box without the need for external plugins.

## Getting Started (NPM install)

```bash
npm install r-server --save-dev
```

Create a `server.js` file in your project root directory and write the following lines of code.

```javascript
let RServer = require('r-server'),
    app = RServer.instance();

//default port is 4000
app.listen(null, () => {
    console.log('listening');
});

//add get route
app.get('/', (req, res) => {
    res.end('<h1>Welcome, Hello World!!!</h1>');
});
```

**Start server**:

```bash
npm start
```

Navigate to `http://localhost:4000/` in your browser to view this mini web project. *It is that simple!*.

## Why R-Server

R-Server gives you many cutting edge, excellent features out of the box, saving you the stress of looking for external plugins and third party solutions. These includes:

### Excellent Request Body Parser

R-Server gives you inbuilt, and excellent control over request body parsing, with ability to handle urlencoded, json-encoded, and multipart form-data including file uploads, requiring no overhead trying to use an external plugin. Multi-value form fields are supported and should be named using [PHP-like](http://php.net/manual/en/tutorial.forms.php) ending bracket notations. e.g `slct-countries[]`, `file-documents[]`.

The parsed request body data are accessible through `request.body`, parsed files are accessible through `request.files`, while query parameters are accessible through `request.query` . There is a `request.data` that is a combination of both `body` and `query` with values in `body` winning the battle in case of conflicting keys.

**Demonstrating Parsed Request Data Accessiblities:**

```javascript
let fs = require('fs'),
    RServer = require('r-server'),
    app = RServer.instance();

//default port is 4000
app.listen();

app.post('user/create', (req, res) => {
    //access data
    let name = req.body.name,
        password = req.body.password,

        //access file
        cvDetails = {
            filename: req.files.cv.fileName,
            filesize: req.files.cv.size,
            mimetype: req.files.cv.mimeType,
            path: req.files.cv.path,
            tempName: req.files.cv.tempName,
        };

    //copy the file to a folder
    fs.copyFileSync(cvDetails.path, 'public/cv/something.pdf');

    res.end('Great, user created');
});
```

### Excellent Routing Engine

It provides an excellent routing engine, with parameter capturing that incoporates data type enforcement on captured parameters. All http methods verbs are made available for routing including `get`, `post`, `put`, `delete`, `options`, `head` and the universal `all` method.

Unlike express, parameter capturing sections are enclosed in *curly braces {}*  and you are not prevented from using hyphen in your parameter names.

```javascript
app.get('user/{user-id}/profile', (req, res, id) => {
    id = /^\d+$/.test(id)? Number.parseInt(id) : 0;

    if (id !== 0)
        res.end('Cool, user id is valid!!!');
    else
        res.end('<h1>Invalid user id found</h1>');
});

//save stress, type hint parameter data type
app.route('user/{int:user-id}/profile', (req, res, id) => {
    //id is already an integer. 0 for NaN
    if (id !== 0)
        res.end('<h1>Your profile is not ready yet');
    else
        res.end('<h1>Invalid user id found</h1>');
});
```

It also supports express `route` method that makes it a breeze to chain routes.

```javascript
app.route('auth/login')
    .get((req, res) => {

    });
    .post((req, res) => {

    });
```

### Excellent Static File Server

It provides static file services out of the box, responding to `GET`, `HEAD`, & `OPTIONS` requests made on such files. By default, it serves files from the project's root directory and also from the `./public` folder. *It does not serve config files (files that starts with dot `.`)*. The list of Default documents includes only 'index.html'. See [customizing-rserver](#customizing-rserver) on how to configure the list of default documents and so many other options.

It uses node.js inbuilt [writable & readable stream API](https://nodejs.org/api/stream.html#stream_class_stream_writable) while serving files for performance gain, user experience and minimal usage of system resources.

It provides excellent content negotiation [headers](https://www.w3.org/Protocols/rfc2616/rfc2616-sec14.html) (`Cache-Control`, `ETag` & `Last-Modified` headers) and would negotiate contents by checking for the presence of the  `if-none-match` & `if-modified-since` http request headers.

### Middleware Usage

There is a `use` method that takes a middleware and registers it on the app.

```javascript
app.use((req, res, next) => {
    //do some things
    ....

    if (req.method !== 'POST')
        next();
    else
        res.end('wrong method');
});
```

### Mountable mini-app Router

It gives you the same feature that `express.Router()` offers, with additional ability to specify if the mini app router should inherit the main app's middleware when it gets mounted.

**call signature:**

```javascript
// inherit middlewares defaults to true
 RServer.Router(inheritMiddlewares?);
```

**Usage Example:**

```javascript
//file routes/auth.js
let rServer = require('r-server'),
    router = rServer.Router(false);

router.use((req , res, next) => {
    next();
});

router.get('/login', (req, res) => {});
router.post('/login', (rq, res) => {});

router.route('signup')
    .get((req, res) => {})
    .post((req, res) => {});

module.exports = router;
```

**Import to main app:**

```javascript
//file app.js
let rServer = require('r-server'),
    authRouter = require('routes/auth.js'),
    app = rServer.instance();

app.listen();

app.mount('auth', router);


//this middleware will not affect
//auth routes, as the router
//specified inherit middleware as false
app.use((req , res, next) => {
    next();
});

router.get('/', (req, res) => {});
router.post('/user/{int:userId}/profile', (rq, res) => {});
```
