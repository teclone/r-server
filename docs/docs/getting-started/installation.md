---
sidebar_position: 2
---

# Installation

## NPM Installation
Install R-Server using npm:

```bash
npm install @teclone/r-server
```

Or using yarn:

```bash
yarn add @teclone/r-server
```

## Basic Setup
Create a new server.js file:

```javascript
const { Server } = require('@teclone/r-server');
const server = new Server();

server.get('/', (req, res) => {
  return res.end('Hello from RServer');
});

module.exports = server;
```

## Starting the Server
You can start the server using the CLI:

```bash
yarn r-server start
```

Or programmatically:

```javascript
server.listen(3000).then(() => console.log('Server running on port 3000'));
```