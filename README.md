# R-Server

[![Build Status](https://travis-ci.org/teclone/r-server.svg?branch=master)](https://travis-ci.org/teclone/r-server)
[![Coverage Status](https://coveralls.io/repos/github/teclone/r-server/badge.svg?branch=master)](https://coveralls.io/github/teclone/r-server?branch=master)
[![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg)](https://github.com/semantic-release/semantic-release)
[![npm version](https://badge.fury.io/js/r-server.svg)](https://badge.fury.io/js/%40teclone%2Fr-server)
![npm](https://img.shields.io/npm/dt/%40teclone%2Fr-server.svg)

RServer is a functional NodeJS web server, optimized for development and production needs, with inbuilt **routing engine**, **request body parser**, **static file streaming with range request support**, **file-upload-processing**, **middleware support**, **request-response profiler **, **excellent exception handling**, **error logging**, **Https easy setup** and lots more.

RServer is compatible with Node v8.12 upwards and provides Http2 support out of the box.

## Newly Added Features

- Http2 support
- Improved Server configuration file

## Getting Started (NPM install)

```bash
npm install @teclone/r-server
```

### Easily serve public folder

```bash
yarn r-sever serve
```

### Easily start a server (server.js)

```typescript
//create server.js
const { Server } = require('@teclone/r-server'); // import rserver
const server = new Server(); // create server instance

// add some route
server.get('/', (req, res) => {
  return res.end('Hello from RServer');
});

// export server to run it via cli (Recommended).
module.exports = server;

// or start the server by yourself
server.listen(3000).then(() => console.log('Running and ready'));
```

start server via cli (Recommended)

```bash
yarn r-server start
```

## Features

R-Server provides many excellent features out of the box. These include:

2. [Configurability](#configuring-rserver)

1. [Http2 Support](#http2)

1. [Excellent Request Body Parser](#request-body-parser)

1. [Excellent Routing Engine](#routing-engine)

1. [Static File Server](#static-file-server)

1. [Middleware Support](#middleware-support)

1. [Mountable Router](#mountable-router)

1. [Error Handling & Logging](#error-handling-&-reporting)

1. [Response Utility Methods](#response-utility-methods)

1. [Custom Http Error Documents](#custom-http-error-documents)

1. [HTTPS Support](#https-support)

1. [Range Request Support](#range-request-support)

### Configurability (.server.config.js)

To configure the server for advanced usage, create a `.server.config.js` as shown below. The configuration shown below is a sample configuration.

```javascript
const { createConfig } = require('@teclone/rollup-all');
module.exports = createConfig({
  // file to log server errors
  errorLog: 'logs/error.log',

  // file to log client requests
  accessLog: 'logs/access.log',

  // folder to store file uploads
  tempDir: 'tmp/uploads',

  // public folders
  publicPaths: ['public'],

  // default assets cache control header
  cacheControl: 'no-cache, max-age=86400',

  encoding: 'latin1',

  maxMemory: '50mb',

  defaultDocuments: ['index.html', 'index.js', 'index.css'],

  httpErrors: {
    baseDir: '',
    404: '',
    500: '',
  },

  port: 8000,

  https: {
    enabled: false,

    port: 9000,

    /* enforce https by redirecting all http request to https */
    enforce: false,

    /* http version, default is http2 .*/
    version: '2', //  Nodejs http2 implementation supports https/1 clients by default

    /* https credentials, use  */
    credentials: {
      key: '.cert/server.key',
      cert: '.cert/server.crt',
      passphrase: 'pfx passphrase',
    },
  },
});
```

### Http2 Support

RServer supports http2 connection out of the box. Http2 is supported only on secure connections. Http2 is used by default if `https.enabled` is set to `true`. To use Https 1, set `https.version` to `1`

If `https.enforce` is set to true, the server listens for both http and https requests but will redirect all http requests to their equivalent https path.

If `https.enabled` is false, the server will listen for http only requests.

### Request Body Parser

It comes with an inbuilt **request body parser**, that supports all forms of http request data such as **urlencoded query strings**, **application/json data**, **application/x-www-form-urlencoded data** and **multipart/form-data**.

Parsed fields and files are made available on the request object via the `query`, `body`, `data` and `files` properties. Uploaded files are stored in a tmp folder, **tmp/uploads**.

The `data` property is a combination of all fields in the `query` and `body` properties, with values in the `body` property winning the battle in case of conflicting field keys.

Multi-value fields are supported as well. They are recognised if the field name ends with the bracket notation `[]`. Note that the brackets are stripped out during the parsing. It uses the same principle like in [PHP](http://php.net/manual/en/tutorial.forms.php).

```typescript
const { Server } = require('@teclone/r-server'); // import rserver
const server = new Server(); // create server instance

server.put('users/{userId}/profile-picture', (req, res) => {
  const picture = req.files.picture;

  return res.json({
    status: 'success',
    message: 'got your file',
    fileSize: picture.size,
    mimeType: picture.type,
    filename: picture.name,
    fileTempLocation: picture.path,
  });
});

server.listen().then(() => console.log('listening'));
```

### Routing Engine

It provides an excellent routing engine, with parameter capturing and can incorporate data type enforcement on captured parameters. All http method verbs are made available in the router including `get`, `post`, `put`, `delete`, `options`, `head` and an `all` method.

Parameter capturing sections are enclosed in curly braces `{}`;

Changed routes are supported through the `Router#route(url)` method. Route callbacks and Middlewares are asynchronous in nature.

It also allows you to set route base path that gets prepended to all routes and middlewares.

**Note that route urls can only be string patterns, and not regex objects**.

**Usage Example**:

```typescript
const { Server, Router } = require('@teclone/r-server'); // import rserver
const server = new Server(); // create server instance

/** get route */
server.get(url, callback, options);

/** post route */
server.post(url, callback, options);

/** put route */
server.put(url, callback, options);

/** head route */
server.head(url, callback, options);

/** delete route */
server.delete(url, callback, options);

/** options route */
server.options(url, callback, options);

/** all method route */
server.all(url, callback, options);
```

**Data Type Enforcement on Captured Parameter**:

```typescript
//no data type enforcement
server.get('users/{userId}', (req, res, { userId }) => {
  userId = /^\d+$/.test(userId) ? Number.parseInt(userId) : 0;
  if (userId !== 0) {
    return res.status(200).json({
      data: {
        id: userId,
        name: 'User Name',
      },
    });
  } else {
    return res.status(400).json({
      errors: {
        userId: 'user id not recognised',
      },
    });
  }
});

//enforce data type
server.get('users/{int:userId}', (req, res, { userId }) => {
  if (userId !== 0) {
    return res.status(200).json({
      data: {
        id: userId,
        name: 'User Name',
      },
    });
  } else {
    return res.status(400).json({
      errors: {
        userId: 'user id not recognised',
      },
    });
  }
});
```

**Chained Routes**:

```typescript
const { Server } = require('@teclone/r-server'); // import rserver
const server = new Server(); // create server instance

server.route('users/{int:userId}')

    .put((req, res, params) => {
        //update user profile
    });

    .delete((req, res, {userId}) => {
        //delete user
    });

    .get((req, res, {userId}) => {
        //retrieve user
    });
```

### Route Base Path

It provides api for setting routing base path that gets prepended to all route urls and middleware urls. This is very helpful when exposing versioned api endpoints in your applications.

**NB: Route base path must be set before registering routes.**

```typescript

const { Server } = require('@teclone/r-server'); // import rserver
const server = new Server(); // create server instance

//examples
server.setBasePath('api/v2.0');

//this route will be called when post request is made on the endpoint /api/v2.0/auth
server.post('auth', (req, res)=> {
    return res.end('received');
}));
```

### Static File Server

Rserver supports streaming/serving of public static files of the box, responding to **GET**, **HEAD**, & **OPTIONS** requests made on such static files. By default, it serves files from the `./public` folder, but this can be extended or changed.

The list of Default documents includes `index.html`, `index.css`, `index.js`. See [configuring-rserver](#configuring-rserver) on how to configure the list of default documents and so many other options.

It uses NodeJS inbuilt [writable & readable stream API](https://nodejs.org/api/stream.html#stream_class_stream_writable) while serving files for performance gain, user experience and minimal usage of system resources.

It provides content negotiation [headers](https://www.w3.org/Protocols/rfc2616/rfc2616-sec14.html) (`Cache-Control`, `ETag` & `Last-Modified`) and would negotiate contents by checking for the presence of the `if-none-match`, `if-modified-since`, & the `if-range` http request headers.

### Middleware Support

It supports the use of middlewares making it easy to run security or pluggable modules per request. One can register global/standalone middlewares or localized route based middlewares. Middlewares can be a single or an array of javascript functions. Middlewares can be asynchronous functions too, that return promises.

```typescript
const { Server } = require('@teclone/r-server'); // import rserver
const server = new Server(); // create server instance

//runs on all request paths, and methods
server.use('*', (req, res, next) => {
  //check if auth token is present in the header and set the req.user property
  return next(); //execute next to pass control to next middleware
});

//runs on root domain and only on post requests
server.use('/', (req, res, next) => next(), {method: 'post'};

// runs on all request paths starting with users/{userId}, inclusive, and all methods
server.use('users/{userId}/*', (req, res, next, {userId}) => next());

//route localized middleware
server.get('auth/login', (req, res) => {
  return res.end('login form will be served :)');
}, (req, res, next) => {
  //redirect user to homepage if user is logged in
  if (req.user) {
      return res.redirect('/');
  }
  else {
      return next();
  }
});

// or
server.get('auth/login', (req, res) => {
  return res.end('login form will be served :)');
}, {
    use: [
      (req, res, next) => {
        //redirect user to homepage if user is logged in
        if (req.user) {
            return res.redirect('/');
        }
        else {
            return next();
        }
      },

      // ...more middlewares if you like
    ]
  }
});
```

### Mountable Router

Mountable router are standalone router instances that can be mounted on the main server. Mountable routers can inherit the main app's standalone middlewares.

**File routes/AuthRoutes.ts**:

```typescript
const { Router } = require('@teclone/r-server'); // import rserver
const authRoutes = new Router(true); // create a mountable router, inherit middleware options is set as true.

//define specific middlewares for auth
authRoutes.use('*', (req, res, next) => {
  // if user is logged in, redirect to homepage
  if (req.user) {
    return res.redirect('/');
  } else {
    return next();
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

**File server.ts**:

```typescript
const { App } = require('@teclone/r-server');
const authRoutes = require('./routes/authRoutes');

const server = RServer.create();

server.get('/', (req, res) => {
  return res.end('Welcome');
});

server.mount('/auth', authRoutes);

server.listen().then(() => console.log('listening'));
```

### Error Handling & Reporting

It logs errors to a user defined error log file which defaults to **logs/error.log**.
When running in development mode, it sends error message and traces back to the client (browsers, etc). In production mode, it hides the error message from the client, but still logs the error to the error log file.

By design, route callbacks are made to return promises, this helps bubble up any error up to our internal error handler for the event loop.

### Response Utility Methods

There are some extended methods made available on the Response object, that includes the following:

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

RServer allows the ability to define custom http error files that are mapped to http error codes such as [404](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/404), etc. This is achieved by defining a `httpErrors` entry in your config file. See [Configuring RServer](#configuring-rserver) for details.

### Range Request Support

RServer will automatically detect and handle any [byte-range](https://developer.mozilla.org/en-US/docs/Web/HTTP/Range_requests) requests that hits the server. This is very important when serving large files such as video and audio files. Range requests is used for data buffering. Visit this [link to read more](https://tools.ietf.org/html/rfc7233) on range requests.

## Contributing

We welcome your own contributions, ranging from code refactoring, documentation improvements, new feature implementations, bugs/issues reporting, etc. we recommend you follow the steps below to actively contribute to this project.
