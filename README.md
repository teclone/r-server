# R-Server

[![Build Status](https://travis-ci.org/harrison-ifeanyichukwu/r-server.svg?branch=master)](https://travis-ci.org/harrison-ifeanyichukwu/r-server)
[![Coverage Status](https://coveralls.io/repos/github/harrison-ifeanyichukwu/r-server/badge.svg?branch=master)](https://coveralls.io/github/harrison-ifeanyichukwu/r-server?branch=master)
[![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg)](https://github.com/semantic-release/semantic-release)
[![npm version](https://badge.fury.io/js/r-server.svg)](https://badge.fury.io/js/r-server)
![npm](https://img.shields.io/npm/dt/r-server.svg)

RServer is a fully integrated [node.js](https://nodejs.org/en/docs/guides/anatomy-of-an-http-transaction/) web server, optimized for development and production needs, with inbuilt routing engine, static file server with range request support, body parser (has support for multipart and file uploads), middleware support, request-response profiler, excellent exception handling, error logging, CORS functionality, https easy setup and lots more.

Despite being configurable for advanced usage, it requires no configurations to get started. It is fully compatible with [express.js](https://expressjs.com/) and provides even more functionalities out of the box.

## Getting Started (NPM install)

```bash
npm install r-server
```

Create your server entry **app.js or server.js** file with some sample codes like below.

```javascript
//import rserver
const RServer = require('r-server');

//get an app instance
const app = RServer.instance();

//start the instance. if port is null, it defaults to process.env.PORT || 4000
app.listen(null, () => {
    console.log('listening');
});

//add some routes
app.get('/', (req, res) => {
    res.end('Hello World');
});
```

Start the server by running `npm start` on the project root directory and navigate your browser to `http://localhost:port/`. **It is that simple**.

## Why R-Server

R-Server gives you many excellent features out of the box, saving you the stress of looking for external plugins and third party solutions. These include:

1. [Excellent Request Body Parser](#request-body-parser)

2. [Excellent Routing Engine](#routing-engine)

3. [Static File Server](#static-file-server)

4. [Middleware Support](#middleware-support)

5. [Mountable Router](#mountable-router)

6. [Error Handling & Reporting](#error-handling-&-reporting)

7. [Response Utility Methods](#response-utility-methods)

8. [Custom Http Error Documents](#custom-http-error-documents)

9. [HTTPS Support](#https-support)

### Request Body Parser

It comes with an inbuilt request body parser, that supports all forms of http request data such as **urlencoded query strings**, **application/json data**, **application/x-www-form-urlencoded data** and **multipart/form-data** formats. Parsed fields and files are made available on the request object through the `query`, `body`, `data` and `files` property. Uploaded files are stored in a tmp folder, **storage/tmp** folder by default unless otherwise stated in a config file.

The `data` property is a combination of all fields in the `query` and `body` properties, with values in the `body` property winning the battle in case of conflicting field keys.

Multi-value fields are supported as well. They are recognised if the field name ends with the bracket notation `[]`. Note that the brackets are stripped out during the parsing. It uses the same principle like in [PHP](http://php.net/manual/en/tutorial.forms.php).

```javascript
//import rserver
const RServer = require('r-server');

//get an app instance
const app = RServer.instance();

//start the instance
app.listen(8000, () => {
    console.log('listening');
});

//add some routes
app.put('users/{user-id}/profile-picture', (req, res, userId) => {
    //retrieve the picture
    const picture = req.files.picture;
    //{path: 'fileAbsPath', tmpName: 'fileTempName', size: 'fileSizeInByte', type: 'fileMimeType'}
    res.json(picture);
});
```

### Routing Engine

It provides an excellent routing engine, with parameter capturing and can incorporate data type enforcement on captured parameters. All http method verbs are made available in the router including `get`, `post`, `put`, `delete`, `options`, `head` and the universal `all` method.

Unlike in [express.js](https://expressjs.com/), parameter capturing sections are enclosed in curly braces `{}` and you are not prevented from using hyphen in your parameter names.

It also supports chained routes through the `Router#route(url)` method. The callback method can be asynchronous or can return promises.

**Usage Example**:

```javascript
/** get route */
app.get(url, callback, options);

/** post route */
app.post(url, callback, options);

/** put route */
app.put(url, callback, options);

/** head route */
app.head(url, callback, options);

/** delete route */
app.delete(url, callback, options);

/** options route */
app.options(url, callback, options);

/** all method route */
app.all(url, callback, options);
```

**Data Type Enforcement on Captured Parameter**:

```javascript
//no data type enforcement
app.get('users/{user-id}/profile', (req, res, userId) => {
    userId = /^\d+$/.test(userId)? Number.parseInt(userId) : 0;
    if (userId === 0) {
        return res.status(200).json({
            status: 'failed',
            data: {
                errors: {
                    'userId': 'invalid user id found'
                }
            }
        });
    }
    //continue processing the request
});

//enforce data type
app.get('users/{int:user-id}/profile', (req, res, userId) => {
    if (userId === 0) {
        return res.status(200).json({
            status: 'failed',
            data: {
                errors: {
                    'userId': 'invalid user id found'
                }
            }
        });
    }
    //continue processing the request
});
```

**Chained Routes**:

```javascript
//chained route
app.route('users/{int:userId}')

    .put((req, res, userId) => {
        //update user profile
    });

    .delete((req, res, userId) => {
        //delete user profile
    });
```

### Static File Server

It provides static file services out of the box, responding to `GET`, `HEAD`, & `OPTIONS` requests made on such static files. By default, it serves files from the `./public` folder. **It does not serve files that starts with dot `.` character or files within a folder that starts with the dot `.` character** unless the `serveDotFiles` configuration option is set to true. It also supports byte range requests that is crucial when serving large file sizes.

The list of Default documents includes `index.html`, `index.css`, `index.js`. See [configuring-rserver](#configuring-rserver) on how to configure the list of default documents and so many other options.

It uses node.js inbuilt [writable & readable stream API](https://nodejs.org/api/stream.html#stream_class_stream_writable) while serving files for performance gain, user experience and minimal usage of system resources.

It provides excellent content negotiation [headers](https://www.w3.org/Protocols/rfc2616/rfc2616-sec14.html) (`Cache-Control`, `ETag` & `Last-Modified`) and would negotiate contents by checking for the presence of the  `if-none-match`, `if-modified-since`, & the `if-range` http request headers.

### Middleware Support

It supports the use of middlewares through the `Router#use(url, middlewares, options)` method and this makes it extensible. The middleware must be a `callable` (function) or an array of callable. It supports asynchronous middlewares by default. Each middleware can be an asynchronous function or a function that returns promise.

```javascript
//middleware that runs on all request
app.use('*', (req, res, next) => {
    if(true)
        return next();
    else
        return res.status(401).end();
});

//middleware that runs on the root domain only, and only on post requests
app.use('/', (req, res, next) => next(), {methods: ['POST']};

//middleware that runs on all paths starting with /users/userId
app.use('users/{userId}/*', (req, res, next, userid) => next());

//use array of middlewares that applies to post method
app.use(url, [middleware1, middleware2], 'POST');
```

### Mountable Router

It gives you the same feature that `express.Router()` offers, with additional ability to specify if the mini app router should inherit the main app's middlewares when it gets mounted.

```javascript
//file routes/AuthRoutes.js
import RServer from 'r-server';

//create a mini router, that does not inherit base app middlewares.
const authRoutes = RServer.Router(false);

//define specific middlewares for auth
authRoutes.use('*', (req , res, next) => {
    if(true)
        return next();
    else
        return res.status(401).end();
});

//use chained route
authRoutes.route('login')

    .get((req, res) => {
        return res.end('login page');
    })

    .post((req, res) => {
        return res.end('process posted data');
    });

authRoutes.route('signup')

    .get((req, res) => {
        return res.end('signup page');
    })

    .post((req, res) => {
        return res.end('process posted data');
    });

export default Authroutes;
```

**import to main app**:

```javascript
import RServer from 'r-server';
import authRoutes from './routes/authRoutes';

const app = RServer.instance();

//http server will listen on port process.env.PORT if set, else it listens on port 4000
app.listen(null, () => {
    console.log('listening');
});

//mount the auth routes
app.mount('auth', authRoutes);

//middleware will not affect auth routes, as it does not inherit it
app.use('*', (req, res, next) => {
    next();
});

app.get('/', (req, res) => {
    return res.end('Welcome');
});
```

### Error Handling & Reporting

It logs errors to a user defined error log file which defaults to **.error.log** if not overriden.
When running in development mode, it sends error message and trace back to the client (browsers, etc). In production mode, it hides the error message from the client, but still logs the error to the error log file.

When using Promises, we encourage you to always have a catch method attached or always include a return statement before the promise. By returning all promises in your codes, any exception will be handled automatically for you by our internal error handler for the event loop.

```javascript
const rServer = require('r-server'),
    app = rServer.instance();

const userModel = require('model/UserModel');

app.get('/users', (req, res) => {
    //always return promises. we will handle any errors for you
    return userModel.find().exec().then(users => {
        //return promise
        return res.json({
            status: 'success',
            data: {
                users
            }
        });
    });
});

app.listen(null, () => {
    console.log('listening');
});
```

### Response Utility Methods

Just like in express.js, there are some extended methods made available on the Response object,
that includes the following:

```javascript
/**
 * set status code. returns this, so it is chainable
*/
res.status(statusCode: number);

/**
 * set response header, returns this, so it is chainable
*/
res.setHeader(name: string, value: mixed);

/**
 * set response headers. returns this, so it is chainable
*/
res.setHeaders(headers: object);

/**
 * send json response, returns promise.
*/
res.json(data: string|jsonObject)

/**
 * redirect client. returns promise
*/
res.redirect(absoluteOrRelativePath: string, statusCode=302)

/**
 * send download file to client. returns promise
*/
res.download(fileAbsoluteOrRelativePath: string, suggestedDownloadSaveName: string)
```

### Custom HTTP Error Documents

RServer is configurable, and allows the ability to define custom http error files that are mapped to http error codes such as [404](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/404), etc. This is achieved by defining a `httpErrors` entry in your config file. See [Configuring RServer](#configuring-rserver) for details.

## Configuring RServer

RServer uses an internal `.server.config.js` file that defines default server configurations for your project. the full config options is as shown below:

```javascript
export default {

    'env': 'development',

    'errorLog': '.error.log',

    'accessLog': '.access.log',

    'profileRequest': false,

    'tempDir': 'storage/temp',

    'publicPaths': [
        'public'
    ],

    'serveDotFiles': false,

    'cacheControl': 'no-cache, max-age=86400',

    'encoding': 'latin1',

    'maxBufferSize': 50000000,

    'mimeTypes': {
        'json': 'application/json',
        'html': 'text/html',
        'xml': 'text/xml',
        'js': 'text/javascript',
        'css': 'text/css',
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'mp3': 'audio/mp3',
        'mp4': 'video/mp4',
        'pdf': 'application/pdf'
    },

    'defaultDocuments': [
        'index.html',
        'index.js',
        'index.css'
    ],

    'httpErrors': {
        'baseDir': '',
        '404': ''
    },

    'https': {
        'enabled': false,
        /** can be overriden by setting process.env.HTTPS_PORT */
        'port': 5000,

        /** enforce https by redirecting all http request to https */
        'enforce': true,

        /** https credentials, use  */
        'credentials': {
            'key': '.cert/server.key',
            'cert': '.cert/server.crt',
            //'pfx': 'relativePath',
            //'passphrase': 'pfx passphrase'
        }
    }
};
```

You can override these options by creating your own custom config file in your project's root directory. You can even name it differently or place it anywhere provided you supply the file's relative path when creating an instance.

```javascript
const rServer = require('r-server'),
    app = rServer.instance(configPath),
    app2 = rServer.instance(configPath2);

app.listen(4000);
app2.listen(9000);

app.get('/', (req, res) => {
    res.end('This is app on port 4000');
});

app2.get('/', (req, res) => {
    res.end('This is app2 on port 9000');
});
```

The two instances above are separate, knows nothing about each other and each uses its own config file, they can even share the same config file. **Note that the config parameter can be the config object rather than a path string**.

Be default, RServer will look for your custom server config file in your project root directory. The following names are supported by default.

```javascript
[
    '.server.json',
    '.server.config.json',
    '.server.config.js',
    '.server.js'
]
```

### HTTPS Support

It is easy to setup a **https server** along with your default http server. Use the `https` config option to declare your https server configuration settings. You can use [letsencrypt](https://letsencrypt.org/) easily to obtain ssl certificates for your application. You can even enforce https for all requests.

**https configuartion**:

```javascript
export default {

    'https': {
        'enabled': false,
        /** can be overriden by setting process.env.HTTPS_PORT */
        'port': 5000,

        /**enforce https for all requests.*/
        'enforce': true,

        /** https credentials, use  */
        'credentials': {
            'key': '.cert/server.key',
            'cert': '.cert/server.crt',
            //'pfx': 'relativePath',
            //'passphrase': 'pfx passphrase'
        }
    }
};
```

## Contributing

We welcome your own contributions, ranging from code refactoring, documentation improvements, new feature implementations, bugs/issues reporting, etc. we recommend you follow the steps below to actively contribute to this project:

1. Having decided on what to help us with, fork this repository

    npm install packages:

    ```bash
    npm install
    ```

2. Implement your ideas

    Implement your code reviews, changes, features, following the [laid out convention](CONTRIBUTING.md),

3. Create a pull request, explaining your improvements/features

## About Project Maintainers

This project is maintained by **Harrison Ifeanyichukwu**, a young, passionate full stack web developer, an [MDN](https://developer.mozilla.org/en-US/profiles/harrison-feanyichukwu) documentator, maintainer of w3c [xml-serializer](https://www.npmjs.com/package/@harrison-ifeanyichukwu/xml-serializer) project, node.js [Rollup-All](https://www.npmjs.com/package/r-server) plugin and other amazing projects.

He is available for hire, ready to work on amazing `PHP`, (Symphony, Drupal, Laravel), `Node.js`, `React`, `JavaScript`, `HTML5`, `CSS` and database projects. Looks forward to hearing from you soon!!!