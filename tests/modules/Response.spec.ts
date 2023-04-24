import { Server } from '../../src/modules/Server';
import { httpHost, withTeardown, sendRequest } from '../helpers';

describe('Response', function () {
  let server: Server;

  beforeEach(() => {
    server = new Server({});
  });

  describe(`#end(data?, encoding?: string): Promise<boolean>`, function () {
    it(`should end the response and return a promise which resolves to true`, function () {
      server.get('/', (req, res) => {
        return res.end().then((result) => {
          expect(result).toEqual(true);
          return true;
        });
      });

      return withTeardown(
        server,
        server.listen().then(() => {
          return sendRequest({ uri: httpHost }).then((res) => {
            expect(res.body).toEqual('');
          });
        })
      );
    });

    it(`can accept a data string or buffer to send back to client`, function () {
      server.get('/', (req, res) => {
        return res.end('got it');
      });

      return withTeardown(
        server,
        server.listen().then(() => {
          return sendRequest({ uri: httpHost }).then((res) => {
            expect(res.body).toEqual('got it');
          });
        })
      );
    });

    it(`can accept data encoding as second argument`, function () {
      server.get('/', (req, res) => {
        return res.end('got it', 'utf8');
      });

      return withTeardown(
        server,
        server.listen().then(() => {
          return sendRequest({ uri: httpHost }).then((res) => {
            expect(res.body).toEqual('got it');
          });
        })
      );
    });
  });

  describe(`#json(data: object | string): Promise<boolean>`, function () {
    const jsonObject = {
      name: 'Harrison',
    };
    const jsonString = JSON.stringify(jsonObject);

    it(`should send a json response back to the client`, function () {
      server.get('/', (req, res) => {
        return res.json(jsonString);
      });

      return withTeardown(
        server,
        server.listen().then(() => {
          return sendRequest({ uri: httpHost }).then((res) => {
            expect(res.body).toEqual(jsonString);
          });
        })
      );
    });

    it(`should automatically stringify the json object before sending`, function () {
      server.get('/', (req, res) => {
        return res.json(jsonObject);
      });

      return withTeardown(
        server,
        server.listen().then(() => {
          return sendRequest({ uri: httpHost }).then((res) => {
            expect(res.body).toEqual(jsonString);
          });
        })
      );
    });
  });

  describe(`#redirect(path: string, status: number = 302): Promise<boolean>`, function () {
    const users = [
      {
        id: 1,
        name: 'Harrison Ifeanyichukwu',
      },
      {
        id: 2,
        name: 'Kalle',
      },
    ];
    const stringifiedUsers = JSON.stringify(users);

    it(`should redirect the client to the new path`, function () {
      server.get('/', (req, res) => {
        return res.redirect('/users');
      });

      server.get('/users', (req, res) => {
        return res.json(users);
      });

      return withTeardown(
        server,
        server.listen().then(() => {
          return sendRequest({ uri: httpHost }).then((res) => {
            expect(res.body).toEqual(stringifiedUsers);
          });
        })
      );
    });
  });

  describe(`#download(filePath: string, filename?: string): Promise<boolean>`, function () {
    it(`should send a download attachment back to the client`, function () {
      server.get('/', (req, res) => {
        return res.download('media/image.jpg', 'preview.jpg');
      });

      return withTeardown(
        server,
        server.listen().then(() => {
          return sendRequest({ uri: httpHost }).then((res) => {
            expect(res.headers).toHaveProperty('content-disposition');
          });
        })
      );
    });
  });

  describe(`#jsonSuccess(statusCode: number = 200, message: string = 'success', data: object = {}): Promise<boolean>`, function () {
    it(`should send success json data back to the client`, function () {
      server.get('/', (req, res) => {
        return res.jsonSuccess({
          message: 'user created successfully',
          data: {
            user: { id: 1 },
          },
        });
      });

      return withTeardown(
        server,
        server.listen().then(() => {
          return sendRequest({ uri: httpHost, json: true }).then((res) => {
            expect(res.body).toHaveProperty('status', 'success');
            expect(res.body).toHaveProperty(
              'message',
              'user created successfully'
            );
          });
        })
      );
    });

    it(`should default the statusCode to 200, message string to 'Request successful' and data object to empty object`, function () {
      server.get('/', (req, res) => {
        return res.jsonSuccess();
      });

      return withTeardown(
        server,
        server.listen().then(() => {
          return sendRequest({ uri: httpHost, json: true }).then((res) => {
            expect(res.body).toHaveProperty('status', 'success');
            expect(res.body).toHaveProperty('message', 'Request successful');
          });
        })
      );
    });
  });

  describe(`#jsonError(statusCode: number = 400, message: string = 'request failed', errors: object = {}): Promise<boolean>`, function () {
    it(`should send error json data back to the client`, function () {
      server.get('/', (req, res) => {
        return res.jsonError({
          statusCode: 403,
          message: 'permission denied',
        });
      });

      return withTeardown(
        server,
        server.listen().then(() => {
          return sendRequest({ uri: httpHost, json: true }).then((res) => {
            expect(res.body).toHaveProperty('status', 'error');
            expect(res.body).toHaveProperty('statusCode', 403);
            expect(res.body).toHaveProperty('message', 'permission denied');
          });
        })
      );
    });

    it(`should default the statusCode to 400, message string to 'Request failed' and errors object to empty object`, function () {
      server.get('/', (req, res) => {
        return res.jsonError();
      });

      return withTeardown(
        server,
        server.listen().then(() => {
          return sendRequest({ uri: httpHost, json: true }).then((res) => {
            expect(res.statusCode).toEqual(400);
            expect(res.body).toHaveProperty('status', 'error');
            expect(res.body).toHaveProperty('message', 'Request failed');
          });
        })
      );
    });
  });

  describe(`#removeHeader(name): this`, function () {
    it(`should remove the given header if it is set`, function () {
      server.get('/', (req, res) => {
        res.setHeader('Content-Language', 'en');
        res.removeHeader('Content-Language');
        return res.jsonError({
          statusCode: 403,
          message: 'permission denied',
        });
      });

      return withTeardown(
        server,
        server.listen().then(() => {
          return sendRequest({ uri: httpHost }).then((res) => {
            expect(res.headers).not.toHaveProperty('content-language');
          });
        })
      );
    });
  });

  describe(`#removeHeaders(...names): this`, function () {
    it(`should remove the given headers if set`, function () {
      const headers = {
        'Content-Language': 'en',
      };

      server.get('/', (req, res) => {
        res.setHeaders(headers);
        res.removeHeaders(...Object.keys(headers));
        return res.jsonError({
          statusCode: 403,
          message: 'permission denied',
        });
      });

      return withTeardown(
        server,
        server.listen().then(() => {
          return sendRequest({ uri: httpHost }).then((res) => {
            expect(res.headers).not.toHaveProperty('content-language');
          });
        })
      );
    });
  });
});
