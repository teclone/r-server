# R-Server

[![Build Status](https://travis-ci.org/harrison-ifeanyichukwu/r-server.svg?branch=master)](https://travis-ci.org/harrison-ifeanyichukwu/r-server)
[![Coverage Status](https://coveralls.io/repos/github/harrison-ifeanyichukwu/r-server/badge.svg?branch=master)](https://coveralls.io/github/harrison-ifeanyichukwu/r-server?branch=master)
[![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg)](https://github.com/semantic-release/semantic-release)
[![npm version](https://badge.fury.io/js/r-server.svg)](https://badge.fury.io/js/r-server)
![npm](https://img.shields.io/npm/dt/r-server.svg)

RServer is a fully integrated, Promise-based [Node.JS](https://nodejs.org/en/docs/guides/anatomy-of-an-http-transaction/) web server, optimized for development and production needs, with inbuilt **routing engine**, **static file server**, **range request support**, **body parser** (has support for multipart and file uploads), **middleware support**, **request-response** profiler, **excellent exception handling**, **error logging**, **Https easy setup** and lots more.

It is fully compatible with [express.js](https://expressjs.com/), and takes minimal migration effort. It provides even more functionalities out of the box.

Note: **RServer is supported starting from Node v8.12 upward**

## Newly Added Features

- Ability to set route base path that will be prepended to all route urls. [here](#route-base-path)
- Https integration and setup made easy [here](#https-support)
- Support for [byte-range](#range-request-support) requests

## Getting Started (NPM install)

```bash
npm install r-server
```

Create your server entry **app.js or server.js** file with some sample codes like below.

```typescript
const Server = require('r-server'); // import rserver
const app = Server.create(); // create server instance

//start the instance. if port is null, it defaults to process.env.PORT || 8000
app.listen(null, () => {
    console.log('listening');
});

// add some route
app.get('/', (req, res) => {
    return res.end('Hello World');
});
```

Start the server by running `npm start` on the project root directory and navigate your browser to `http://localhost:8000/`. **It is that simple**.

## Why R-Server

R-Server gives you many excellent features out of the box, saving you the stress of looking for external plugins and third party solutions. These include:

1. [Excellent Request Body Parser](#request-body-parser)

2. [Excellent Routing Engine](#routing-engine)

3. [Static File Server](#static-file-server)

4. [Middleware Support](#middleware-support)

5. [Mountable Router](#mountable-router)

6. [Error Handling & Logging](#error-handling-&-reporting)

7. [Response Utility Methods](#response-utility-methods)

8. [Custom Http Error Documents](#custom-http-error-documents)

9. [HTTPS Support](#https-support)

10. [Range Request Support](#range-request-support)

### Request Body Parser

It comes with an inbuilt **request body parser**, that supports all forms of http request data such as **urlencoded query strings**, **application/json data**, **application/x-www-form-urlencoded data** and **multipart/form-data**.

Parsed fields and files are made available on the request object through the `query`, `body`, `data` and `files` properties. Uploaded files are stored in a tmp folder, **storage/tmp** folder by default unless otherwise stated in a config file.

The `data` property is a combination of all fields in the `query` and `body` properties, with values in the `body` property winning the battle in case of conflicting field keys.

Multi-value fields are supported as well. They are recognised if the field name ends with the bracket notation `[]`. Note that the brackets are stripped out during the parsing. It uses the same principle like in [PHP](http://php.net/manual/en/tutorial.forms.php).

```typescript
const Server = require('r-server'); // import rserver
const app = Server.create(); // create server instance

//start the instance. if port is null, it defaults to process.env.PORT || 8000
app.listen(null, () => {
    console.log('listening');
});

app.put('users/{userId}/profile-picture', (req, res) => {
    const picture = req.files.picture;
    return res.json({
        status: 'success',
        message: 'got your file'
    });
});
```

### Routing Engine

It provides an excellent routing engine, with parameter capturing and can incorporate data type enforcement on captured parameters. All http method verbs are made available in the router including `get`, `post`, `put`, `delete`, `options`, `head` and the universal `all` method.

Unlike in [express.js](https://expressjs.com/), parameter capturing sections are enclosed in curly braces `{}`;

It also supports chained routes through the `Router#route(url)` method. Route callbacks and Middlewares can be asynchronous in nature.

It also allows you to set route base path that gets prepended to all route urls and middleware urls.

**Note that route urls can only be string patterns, and not regex objects**.

**Usage Example**:

```typescript
const Server = require('r-server'); // import rserver
const app = Server.create(); // create server instance

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

```typescript
//no data type enforcement
app.get('users/{userId}', (req, res, userId) => {
    userId = /^\d+$/.test(userId)? Number.parseInt(userId) : 0;
    if (userId !== 0) {
        return res.status(200).json({
            data: {
                id: userId,
                name: 'User Name'
            }
        });
    }
    else {
        return res.status(400).json({
            errors: {
                userId: 'user id not recognised'
            }
        });
    }
});

//enforce data type
app.get('users/{int:userId}', (req, res, userId) => {
    if (userId !== 0) {
        return res.status(200).json({
            data: {
                id: userId,
                name: 'User Name'
            }
        });
    }
    else {
        return res.status(400).json({
            errors: {
                userId: 'user id not recognised'
            }
        });
    }
});
```

**Chained Routes**:

```typescript
const Server = require('r-server'); // import rserver
const app = Server.create(); // create server instance

app.route('users/{int:userId}')

    .put((req, res, userId) => {
        //update user profile
    });

    .delete((req, res, userId) => {
        //delete user
    });

    .get((req, res, userId) => {
        //retrieve user
    });
```

### Route Base Path

It provides api for setting routing base path that gets prepended to all route urls and middleware urls. This is very helpful when exposing versioned api endpoints in your applications.

**NB: Route base path must be set before registering routes.**

```typescript
const Server = require('r-server'); // import rserver
const app = Server.create(); // create server instance

const request = require('request');
//examples
app.setBasePath('api/v2.0');

//this route will be called when request is made on the endpoint /api/v2.0/auth
app.post('auth', (req, res)=> {
    return res.end('received');
}));

describe(`setBasePath(basePath: string)`, function() {
    it(`should append the basePath to all route urls`, function(done) {
        app.listen(null, () => {
            request.post(`http://localhost:8000/auth`, {}, (err, res, body) => {
                expect(body).toEqual('received');
                app.close(() => {
                    done();
                });
            });
        });
    });
});
```

### Static File Server

It provides public static file services out of the box, responding to **GET**, **HEAD**, & **OPTIONS** requests made on such static files. By default, it serves files from the `./public` folder. **It does not serve files that starts with dot `.` character or files within a folder that starts with the dot `.` character** unless the `serveHiddenFiles` configuration option is set to true. It also supports byte range requests that is crucial when serving large files.

The list of Default documents includes `index.html`, `index.css`, `index.js`. See [configuring-rserver](#configuring-rserver) on how to configure the list of default documents and so many other options.

It uses node.js inbuilt [writable & readable stream API](https://nodejs.org/api/stream.html#stream_class_stream_writable) while serving files for performance gain, user experience and minimal usage of system resources.

It provides excellent content negotiation [headers](https://www.w3.org/Protocols/rfc2616/rfc2616-sec14.html) (`Cache-Control`, `ETag` & `Last-Modified`) and would negotiate contents by checking for the presence of the  `if-none-match`, `if-modified-since`, & the `if-range` http request headers.

### Middleware Support

It supports the use of middlewares making it easy to run security or pluggable modules/methods and this makes it extensible. One can register global/standalone middlewares or localized route based middlewares. Middlewares can be a single or an array of javascript functions. Middlewares can be asynchronous functions too, that return promises.

```typescript
const Server = require('r-server'); // import rserver
const app = Server.create(); // create server instance

//standalone middleware, runs on all request methods
app.use('*', (req, res, next) => {
    //check if auth token is present in the header and set the req.user property

    next(); //execute next to pass control or next middleware
});

//standalone middleware, runs on root domain and only on post request
app.use('/', (req, res, next) => next(), {method: 'post'};

//standalone middleware that runs on all paths starting with /users/{userId}
app.use('users/{userId}/*', (req, res, next, userId) => next());

//route localized middleware
app.get('auth/login', (req, res) => {res.end()}, (req, res, next) => {
    //redirect user to homepage if user is logged in
    if (req.user) {
        res.redirect('/');
    }
    else {
        next();
    }
});
```

### Mountable Router

It gives you the same feature that `express.Router()` offers, with additional ability to specify if the mini app router should inherit the main app's middlewares when it gets mounted.

**File routes/AuthRoutes.js**:

```javascript
const Server = require('r-server'); // import rserver
const authRoutes = Server.Router(true); // create a mountable router

//define specific middlewares for auth
authRoutes.use('*', (req , res, next) => {
    // if user is logged in, redirect to homepage
    if (req.user) {
        res.redirect('/');
    }
    else {
        next();
    }
});

authRoutes.post('signup', (req, res) => {
    // process account creation
});

authRoutes.post('login', (req, res) => {
    //process login
});

authRoutes.post('reset-password', (req, res) => {
    // process password reset
});

export default Authroutes;
```

**File app.js**:

```javascript
const Server = require('r-server');
const authRoutes = require('./routes/authRoutes');

const app = RServer.create();

app.mount('/auth', authRoutes);

app.get('/', (req, res) => {
    return res.end('Welcome');
});

//http server will listen on port process.env.PORT if set, else it listens on port 4000
app.listen(null, () => {
    console.log('listening');
});
```

### Error Handling & Reporting

It logs errors to a user defined error log file which defaults to **.log/error.log** if not overriden.
When running in development mode, it sends error message and traces back to the client (browsers, etc). In production mode, it hides the error message from the client, but still logs the error to the error log file.

By design, route callbacks are made to return promises, this helps bubble up any error up to our internal error handler for the event loop.

### Response Utility Methods

Just like in **express.js**, there are some extended methods made available on the Response object, that includes the following:

```typescript

/**
 * ends the response with optional response data, and optional data encoding
 */
end(data?, encoding?: string): Promise<boolean>;

/**
 * sets response header
 */
setHeader(name: string, value: string | number | string[]): this;

/**
 * sets multiple response headers
 */
setHeaders(headers: {[p: string]: string | number | string[]}): this;

/**
 * removes a single set response header at a time. function is chainable
 */
removeHeader(name: string): this;

/**
 * remove response headers that are already set. function is chainable
 */
removeHeaders(...names: string[]): this;

/**
 * sets response status code
 */
status(code: number): this;

/**
 * sends json response back to the client.
 */
json(data: object | string): Promise<boolean>;

/**
 * Redirect client to the given url
 */
redirect(path: string, status: number = 302): Promise<boolean>;

/**
 * sends a file download attachment to the client
 */
download(filePath: string, filename?: string): Promise<boolean>;
```

### Custom HTTP Error Documents

RServer is configurable, and allows the ability to define custom http error files that are mapped to http error codes such as [404](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/404), etc. This is achieved by defining a `httpErrors` entry in your config file. See [Configuring RServer](#configuring-rserver) for details.

## Configuring RServer

RServer uses an internal `.server.ts` file that defines default server configurations for your project. the full config options is as shown below:

```typescript
import { RServerConfig } from './@types';

const rServerConfig: RServerConfig = {

    env: 'dev',

    errorLog: '.log/error.log',

    accessLog: '.log/access.log',

    profileRequest: true,

    tempDir: 'storage/temp',

    publicPaths: [
        'public'
    ],

    serveHiddenFiles: false,

    cacheControl: 'no-cache, max-age=86400',

    encoding: 'latin1',

    maxMemory: '50mb',

    defaultDocuments: [
        'index.html',
        'index.js',
        'index.css'
    ],

    httpErrors: {
        baseDir: '',
        404: '',
        500: ''
    },

    https: {
        enabled: false,
        /* can be overriden by setting process.env.HTTPS_PORT */
        port: 9000,

        /* enforce https by redirecting all http request to https */
        enforce: true,

        /* https credentials, use  */
        credentials: {
            key: '.cert/server.key',
            cert: '.cert/server.crt',
            //'pfx': 'relativePath',
            passphrase: 'pfx passphrase'
        }
    }
}

export default rServerConfig;
```

You can override these options by creating your own custom config file in your project's root directory. You can even name it differently or place it anywhere provided you supply the file's relative path when creating an instance.

```typescript
const Server = require('r-server');
const app1 = RServer.create(configPath1);
const app2 = RServer.create(configPath2);

app1.listen(4000);
app2.listen(5000);

app1.get('/', (req, res) => {
    return res.end('This is app on port 4000');
});

app2.get('/', (req, res) => {
    return res.end('This is app2 on port 5000');
});
```

The two instances above are separate, knows nothing about each other and each uses its own config file, they can even share the same config file. **Note that the config parameter can be the config object rather than a path string**.

### HTTPS Support

It is easy to setup a **https server** along with your default http server. Use the `https` config option to declare your https server configuration settings. You can use [letsencrypt](https://letsencrypt.org/) easily to obtain ssl certificates for your application. You can even enforce https for all requests.

**https configuartion**:

```typescript
import { RServerConfig } from './@types';

const rServerConfig: RServerConfig = {

    env: 'dev',

    errorLog: '.log/error.log',

    accessLog: '.log/access.log',

    profileRequest: true,

    tempDir: 'storage/temp',

    publicPaths: [
        'public'
    ],

    serveHiddenFiles: false,

    cacheControl: 'no-cache, max-age=86400',

    encoding: 'latin1',

    maxMemory: '50mb',

    defaultDocuments: [
        'index.html',
        'index.js',
        'index.css'
    ],

    httpErrors: {
        baseDir: '',
        404: '',
        500: ''
    },

    https: {
        enabled: false,
        /* can be overriden by setting process.env.HTTPS_PORT */
        port: 9000,

        /* enforce https by redirecting all http request to https */
        enforce: true,

        /* https credentials */
        credentials: {
            key: '.cert/server.key',
            cert: '.cert/server.crt',
            //'pfx': 'relativePath',
            //passphrase: 'pfx passphrase'
        }
    }
}

export default rServerConfig;
```

### Range Request Support

RServer will automatically detect and handle any [byte-range](https://developer.mozilla.org/en-US/docs/Web/HTTP/Range_requests) requests that hits the server. This is very important as it eases the server load when serving large files as browsers tend to throttle requests using range request mechanism. Visit this [link to read more](https://tools.ietf.org/html/rfc7233) on range requests.

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