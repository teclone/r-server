# R-Server

[![Build Status](https://travis-ci.org/harrison-ifeanyichukwu/r-server.svg?branch=master)](https://travis-ci.org/harrison-ifeanyichukwu/r-server)
[![Coverage Status](https://coveralls.io/repos/github/harrison-ifeanyichukwu/r-server/badge.svg?branch=master)](https://coveralls.io/github/harrison-ifeanyichukwu/r-server?branch=master)
[![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg)](https://github.com/semantic-release/semantic-release)
[![npm version](https://badge.fury.io/js/r-server.svg)](https://badge.fury.io/js/r-server)
![npm](https://img.shields.io/npm/dt/r-server.svg)

RServer is a lightweight, fully integrated [node.js](https://nodejs.org/en/docs/guides/anatomy-of-an-http-transaction/) web server, optimized for developement and production needs, with inbuilt routing engine, static file server, body parser (has support for multipart and file uploads), middleware support, request-response profiler, excellent exception handling, error logging, security and lots more.

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

//start the instance
app.listen(process.env.PORT || 8000, () => {
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

### Request Body Parser

It comes with an inbuilt request body parser, that parses all forms of http request data such as **urlencoded query strings**, **application/json data**, **application/x-www-form-urlencoded data** and **multipart/form-data** formats. Parsed fields and files are made available on the request object through the `query`, `body`, `data` and `files` property. Uploaded files are stored in a tmp folder, **storage/tmp** folder by default unless otherwise stated in a config file.

The `data` property is a combination of all fields in the `query` and `body` properties, with values in the `body` property winning the battle in case of conflicting field keys.

Multi-value fields are supported as well. They are recognised if the field name ends with the bracket notation `[]`. Note that the brackets are stripped out during the parsing. It uses the same idea as [PHP](http://php.net/manual/en/tutorial.forms.php).

```javascript
//import rserver
const RServer = require('r-server');

//get an app instance
const app = RServer.instance();

//start the instance
app.listen(process.env.PORT || 8000, () => {
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

It provides an excellent routing engine, with parameter capturing and can incoporate data type enforcement on captured parameters. All http method verbs are made available in the router including `get`, `post`, `put`, `delete`, `options`, `head` and the universal `all` method.

Unlike in express.js, parameter capturing sections are enclosed in curly braces `{}` and you are not prevented from using hyphen in your parameter names.

It also supports chained routes through the `Router#route(url)` method.

```javascript
//import rserver
const RServer = require('r-server');
const fs = require('fs');

//get an app instance
const app = RServer.instance();

//start the instance
app.listen(process.env.PORT || 8000, () => {
    console.log('listening');
});

//add some routes
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

//chained route
app.route('users/{int:userId}')
    .put((req, res, userId) => {
        //update user profile
    });
    .delete((req, res, userId) => {
        //delete user profile
    });
```