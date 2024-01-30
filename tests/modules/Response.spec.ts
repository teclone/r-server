import { Server } from '../../src/modules/Server';
import { httpHost, sendRequest } from '../helpers';

describe('Response', function () {
  let server: Server;

  beforeEach(() => {
    server = new Server({});
  });

  afterEach(() => {
    return server.close();
  });

  describe(`#end(data?, encoding?: string): Promise<boolean>`, function () {
    it(`should end the response and return a promise which resolves to true`, function () {
      server.get('/', (req, res) => {
        return res.end();
      });

      return server.listen().then(() => {
        return sendRequest({ uri: httpHost }).then((res) => {
          expect(res.body).toEqual('');
        });
      });
    });

    it(`can accept a data string or buffer to send back to client`, function () {
      server.get('/', (req, res) => {
        return res.end('got it');
      });

      return server.listen().then(() => {
        return sendRequest({ uri: httpHost }).then((res) => {
          expect(res.body).toEqual('got it');
        });
      });
    });

    it(`can accept data encoding as second argument`, function () {
      server.get('/', (req, res) => {
        return res.end('got it', 'utf8');
      });

      return server.listen().then(() => {
        return sendRequest({ uri: httpHost }).then((res) => {
          expect(res.body).toEqual('got it');
        });
      });
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

      return server.listen().then(() => {
        return sendRequest({ uri: httpHost }).then((res) => {
          expect(res.body).toEqual(jsonString);
        });
      });
    });

    it(`should automatically stringify the json object before sending`, function () {
      server.get('/', (req, res) => {
        return res.json(jsonObject);
      });

      return server.listen().then(() => {
        return sendRequest({ uri: httpHost }).then((res) => {
          expect(res.body).toEqual(jsonString);
        });
      });
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

      return server.listen().then(() => {
        return sendRequest({ uri: httpHost }).then((res) => {
          expect(res.body).toEqual(stringifiedUsers);
        });
      });
    });
  });

  describe(`#download(filePath: string, filename?: string): Promise<boolean>`, function () {
    it(`should send a download attachment back to the client`, function () {
      server.get('/', (req, res) => {
        return res.download('media/image.jpg', 'preview.jpg');
      });

      return server.listen().then(() => {
        return sendRequest({ uri: httpHost }).then((res) => {
          expect(res.headers).toHaveProperty('content-disposition');
        });
      });
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

      return server.listen().then(() => {
        return sendRequest({ uri: httpHost, json: true }).then((res) => {
          expect(res.body).toHaveProperty(
            'message',
            'user created successfully'
          );
        });
      });
    });

    it(`should default the statusCode to 200, message string to 'Request successful' and data object to empty object`, function () {
      server.get('/', (req, res) => {
        return res.jsonSuccess();
      });

      return server.listen().then(() => {
        return sendRequest({ uri: httpHost, json: true }).then((res) => {
          expect(res.body).toHaveProperty('message', 'Request successful');
        });
      });
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

      return server.listen().then(() => {
        return expect(
          sendRequest({ uri: httpHost, json: true })
        ).rejects.toMatchObject({
          statusCode: 403,
          response: {
            body: {
              message: 'permission denied',
            },
          },
        });
      });
    });

    it(`should default the statusCode to 400, message string to 'Request failed' and data to null`, function () {
      server.get('/', (req, res) => {
        return res.jsonError();
      });

      return server.listen().then(() => {
        return expect(
          sendRequest({ uri: httpHost, json: true })
        ).rejects.toMatchObject({
          response: {
            body: {
              message: 'Request failed',
              errors: null,
            },
          },
        });
      });
    });
  });

  describe(`#setHeader(name, value): this`, function () {
    it(`should set the given header to the response headers`, function () {
      server.get('/', (req, res) => {
        res.setHeader('X-hello', 'hi');
        return res.jsonSuccess();
      });

      return server.listen().then(() => {
        return sendRequest({ uri: httpHost }).then((res) => {
          expect(res.headers).toHaveProperty('x-hello', 'hi');
        });
      });
    });
  });

  describe(`#setHeaders(headers): this`, function () {
    it(`should set the given headers to the response headers`, function () {
      server.get('/', (req, res) => {
        res.setHeaders({ hello: 'hi', you: 'me' });
        return res.jsonSuccess();
      });

      return server.listen().then(() => {
        return sendRequest({ uri: httpHost }).then((res) => {
          expect(res.headers).toMatchObject({
            hello: 'hi',
            you: 'me',
          });
        });
      });
    });
  });

  describe(`#removeHeader(name): this`, function () {
    it(`should remove the given header if it is set`, function () {
      server.get('/', (req, res) => {
        res.setHeader('Content-Language', 'en');
        res.removeHeader('Content-Language');
        return res.status(200).json();
      });

      return server.listen().then(() => {
        return sendRequest({ uri: httpHost }).then((res) => {
          expect(res.headers).not.toHaveProperty('content-language');
        });
      });
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
        return res.status(200).end();
      });

      return server.listen().then(() => {
        return sendRequest({ uri: httpHost }).then((res) => {
          expect(res.headers).not.toHaveProperty('content-language');
        });
      });
    });
  });
});
