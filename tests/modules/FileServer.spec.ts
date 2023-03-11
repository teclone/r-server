import { FileServer } from '../../src/modules/FileServer';
import { App } from '../../src/modules/App';
import { Logger } from '../../src/modules/Logger';
import {
  httpHost,
  resolvePath,
  withTeardown,
  sendRequest,
} from '../helpers/index';
import { readFileSync, statSync } from 'fs';
import { ALLOWED_METHODS } from '../../src/modules/Constants';

describe(`FileServer`, function () {
  let app: App;
  let logger: Logger;

  const createFileServer = (req, res) => {
    return new FileServer(app.getConfig(), req, res);
  };

  beforeEach(function () {
    app = new App({});
    logger = new Logger(app.getConfig());
  });

  describe(`serve(url: Url, method: Method, request: Request,
        response: Response): Promise<boolean>`, function () {
    it(`should respond to get requests made on public static files, serving such file
            back to the client`, function () {
      app.get('/', (req, res) => {
        return createFileServer(req, res).serve('/index.html');
      });
      return withTeardown(
        app,
        app.listen().then(() => {
          return sendRequest({ uri: httpHost }).then((res) => {
            expect(res.body).toEqual(
              readFileSync(resolvePath('public/index.html'), 'utf8')
            );
          });
        })
      );
    });

    it(`should respond to options requests made on public static files, responding with
            allow header`, function () {
      app.options('/', (req, res) => {
        return createFileServer(req, res).serve('/index.html');
      });
      return withTeardown(
        app,
        app.listen().then(() => {
          return sendRequest({ uri: httpHost, method: 'options' }).then(
            (res) => {
              expect(res.headers).toHaveProperty(
                'allow',
                ALLOWED_METHODS.join(',')
              );
            }
          );
        })
      );
    });

    it(`should respond to head requests made on public static files, responding with
            header information about the file`, function () {
      app.head('/', (req, res) => {
        return createFileServer(req, res).serve('/index.html');
      });

      return withTeardown(
        app,
        app.listen().then(() => {
          return sendRequest({ uri: httpHost, method: 'head' }).then((res) => {
            expect(res.headers).toHaveProperty('content-type', 'text/html');
            expect(res.headers).toHaveProperty('accept-ranges', 'bytes');
            expect(res.headers).toHaveProperty('content-length');
            expect(res.headers).toHaveProperty('etag');
            expect(res.headers).toHaveProperty('last-modified');
          });
        })
      );
    });

    it(`should search for a default document if specified path maps to a folder`, function () {
      app.get('/', (req, res) => {
        return createFileServer(req, res).serve('/');
      });

      return withTeardown(
        app,
        app.listen().then(() => {
          return sendRequest({ uri: httpHost, method: 'get' }).then((res) => {
            expect(res.body).toEqual(
              readFileSync(resolvePath('public/index.html'), 'utf8')
            );
          });
        })
      );
    });

    it(`should do nothing and resolve to false if request method is neither get, head nor options
            method`, function () {
      app.post('/', (req, res) => {
        return createFileServer(req, res)
          .serve('/index.html')
          .then((status) => {
            if (status === false) {
              return res.end('correct');
            } else {
              return true;
            }
          });
      });

      return withTeardown(
        app,
        app.listen().then(() => {
          return sendRequest({ uri: httpHost, method: 'post' }).then((res) => {
            expect(res.body).toEqual('correct');
          });
        })
      );
    });

    it(`should do nothing and resolve to false if specified file does not exist or if it
            maps to a folder that has no default document`, function () {
      app.get('/', (req, res) => {
        return createFileServer(req, res)
          .serve('/media')
          .then((status) => {
            if (status === false) {
              return res.end('correct');
            } else {
              return true;
            }
          });
      });

      return withTeardown(
        app,
        app.listen().then(() => {
          return sendRequest({ uri: httpHost, method: 'get' }).then((res) => {
            expect(res.body).toEqual('correct');
          });
        })
      );
    });

    it(`should respond with 304 response header to get requests made on public static files,
            if file is not modified since it was last served to the client using the sent
            if-none-match header`, function () {
      app.get('/', (req, res) => {
        return createFileServer(req, res).serve('/index.html');
      });

      return withTeardown(
        app,
        app.listen().then(() => {
          return sendRequest({ uri: httpHost }).then((res) => {
            expect(res.statusCode).toEqual(200);
            const headers = {
              'if-none-match': res.headers['etag'],
            };

            return sendRequest({ uri: httpHost, headers }).then((res) => {
              expect(res.statusCode).toEqual(304);
            });
          });
        })
      );
    });

    it(`should respond with 304 response header to get requests made on public static files,
            if file is not modified since it was last served to the client using the sent
            if-modified-since header`, function () {
      app.get('/', (req, res) => {
        return createFileServer(req, res).serve('/index.html');
      });

      return withTeardown(
        app,
        app.listen().then(() => {
          return sendRequest({ uri: httpHost }).then((res) => {
            expect(res.statusCode).toEqual(200);
            const headers = {
              'if-modified-since': res.headers['last-modified'],
            };

            return sendRequest({ uri: httpHost, headers }).then((res) => {
              expect(res.statusCode).toEqual(304);
            });
          });
        })
      );
    });
  });

  describe(`serveHttpErrorFile(method: Method, request: Request,
        response: Response, status: number): Promise<boolean>`, function () {
    it(`should serve the user defined http error file for the given status code`, function () {
      const file = 'tests/helpers/404.html';
      app = new App({
        config: {
          httpErrors: {
            404: file,
          },
        },
      });

      app.get('/', (req, res) => {
        return createFileServer(req, res).serveHttpErrorFile(404);
      });

      return withTeardown(
        app,
        app.listen().then(() => {
          return sendRequest({ uri: httpHost }).then((res) => {
            expect(res.statusCode).toEqual(404);

            expect(res.body).toEqual(readFileSync(resolvePath(file), 'utf8'));
          });
        })
      );
    });

    it(`should default to its internal http error file if there is none defined for the
            given status code by the user`, function () {
      app.get('/', (req, res) => {
        return createFileServer(req, res).serveHttpErrorFile(404);
      });

      return withTeardown(
        app,
        app.listen().then(() => {
          return sendRequest({ uri: httpHost }).then((res) => {
            expect(res.statusCode).toEqual(404);

            expect(res.body).toEqual(
              readFileSync(resolvePath('src/httpErrors/404.html'), 'utf8')
            );
          });
        })
      );
    });

    it(`should simply end the response with no data sent if there is no http file for the
            given status code`, function () {
      app.get('/', (req, res) => {
        return createFileServer(req, res).serveHttpErrorFile(500);
      });

      return withTeardown(
        app,
        app.listen().then(() => {
          return sendRequest({ uri: httpHost }).then((res) => {
            expect(res.statusCode).toEqual(500);

            expect(res.body).toEqual('');
          });
        })
      );
    });
  });

  describe(`serveDownload(request: Request, response: Response, filePath: string,
        filename?: string): Promise<boolean>`, function () {
    it(`should respond to options, get, and head requests on the given resource, sending
            the file as download attachment to the client`, function () {
      const file = 'public/media/image.jpg';

      app.get('/', (req, res) => {
        return createFileServer(req, res).serveDownload(file, 'preview.jpg');
      });

      return withTeardown(
        app,
        app.listen().then(() => {
          return sendRequest({ uri: httpHost }).then((res) => {
            expect(res.headers).toHaveProperty(
              'content-disposition',
              'attachment; filename="preview.jpg"'
            );
          });
        })
      );
    });

    it(`should generate a download suggested filename if not given, based on the file name`, function () {
      const file = 'public/media/image.jpg';
      app.get('/', (req, res) => {
        return createFileServer(req, res).serveDownload(file);
      });

      return withTeardown(
        app,
        app.listen().then(() => {
          return sendRequest({ uri: httpHost }).then((res) => {
            expect(res.headers).toHaveProperty(
              'content-disposition',
              'attachment; filename="image.jpg"'
            );
          });
        })
      );
    });

    it(`should search public folders for the given files if file could not be
            resolved`, function () {
      const file = 'media/image.jpg';
      app.get('/', (req, res) => {
        return createFileServer(req, res).serveDownload(file, 'preview.jpg');
      });

      return withTeardown(
        app,
        app.listen().then(() => {
          return sendRequest({ uri: httpHost }).then((res) => {
            expect(res.headers).toHaveProperty(
              'content-disposition',
              'attachment; filename="preview.jpg"'
            );
          });
        })
      );
    });

    it(`should reject with error if given file could not be found`, function () {
      const file = 'media/unknown.jpg';
      app.get('/', (req, res) => {
        return createFileServer(req, res)
          .serveDownload(file, 'preview.jpg')
          .catch((ex) => {
            res.end('correct');
            return true;
          });
      });

      return withTeardown(
        app,
        app.listen().then(() => {
          return sendRequest({ uri: httpHost }).then((res) => {
            expect(res.body).toEqual('correct');
          });
        })
      );
    });
  });

  describe(`Range Request`, function () {
    const stat = statSync(resolvePath('public/media/image.jpg'));
    const size = stat.size;

    it(`should respond and handle range requests, responding appropriately with the requested
        range of data`, function () {
      app.get('/', (req, res) => {
        return createFileServer(req, res).serve('/media/image.jpg');
      });

      return withTeardown(
        app,
        app.listen().then(() => {
          return sendRequest({
            uri: httpHost,
            headers: {
              Range: `0-999`,
            },
          }).then((res) => {
            expect(res.headers).toHaveProperty(
              'content-range',
              `bytes 0-999/${size}`
            );
            expect(res.headers).toHaveProperty('content-length', `1000`);
          });
        })
      );
    });

    it(`should respond and handle range requests, sending the last suffix bytes as indicated
            by the given suffix-byte-range`, function () {
      app.get('/', (req, res) => {
        return createFileServer(req, res).serve('/media/image.jpg');
      });

      return withTeardown(
        app,
        app.listen().then(() => {
          return sendRequest({
            uri: httpHost,
            headers: {
              Range: `-1000`,
            },
          }).then((res) => {
            expect(res.headers).toHaveProperty(
              'content-range',
              `bytes ${size - 1000}-${size - 1}/${size}`
            );
            expect(res.headers).toHaveProperty('content-length', `1000`);
          });
        })
      );
    });

    it(`should respond and handle range requests, sending the whole bytes if the given
            suffix-byte-range is not less than the file size`, function () {
      app.get('/', (req, res) => {
        return createFileServer(req, res).serve('/media/image.jpg');
      });

      return withTeardown(
        app,
        app.listen().then(() => {
          return sendRequest({
            uri: httpHost,
            headers: {
              Range: `-${size + 1000}`,
            },
          }).then((res) => {
            expect(res.headers).toHaveProperty(
              'content-range',
              `bytes 0-${size - 1}/${size}`
            );
            expect(res.headers).toHaveProperty('content-length', `${size}`);
          });
        })
      );
    });

    it(`should respond and handle range requests, sending from the given beginning byte to the
            end of the file if there is no end byte specified`, function () {
      app.get('/', (req, res) => {
        return createFileServer(req, res).serve('/media/image.jpg');
      });

      return withTeardown(
        app,
        app.listen().then(() => {
          return sendRequest({
            uri: httpHost,
            headers: {
              Range: `1000-`,
            },
          }).then((res) => {
            expect(res.headers).toHaveProperty(
              'content-range',
              `bytes 1000-${size - 1}/${size}`
            );
            expect(res.headers).toHaveProperty(
              'content-length',
              `${size - 1000}`
            );
          });
        })
      );
    });

    it(`should respond and reject the range, if the ending range byte is less than the
            beginning byte`, function () {
      app.get('/', (req, res) => {
        return createFileServer(req, res).serve('/media/image.jpg');
      });

      return withTeardown(
        app,
        app.listen().then(() => {
          return sendRequest({
            uri: httpHost,
            headers: {
              Range: `1000-500`,
            },
          }).then((res) => {
            expect(res.statusCode).toEqual(416);
            expect(res.headers).toHaveProperty(
              'content-range',
              `bytes */${size}`
            );
          });
        })
      );
    });

    it(`should respond and reject the range, if the given suffix range byte is a zero length
            byte`, function () {
      app.get('/', (req, res) => {
        return createFileServer(req, res).serve('/media/image.jpg');
      });

      return withTeardown(
        app,
        app.listen().then(() => {
          return sendRequest({
            uri: httpHost,
            headers: {
              Range: `-0`,
            },
          }).then((res) => {
            expect(res.statusCode).toEqual(416);
            expect(res.headers).toHaveProperty(
              'content-range',
              `bytes */${size}`
            );
          });
        })
      );
    });

    it(`should respond and reject the range, if the beginning range byte is not
            less than file size`, function () {
      app.get('/', (req, res) => {
        return createFileServer(req, res).serve('/media/image.jpg');
      });

      return withTeardown(
        app,
        app.listen().then(() => {
          return sendRequest({
            uri: httpHost,
            headers: {
              Range: `${size}-`,
            },
          }).then((res) => {
            expect(res.statusCode).toEqual(416);
            expect(res.headers).toHaveProperty(
              'content-range',
              `bytes */${size}`
            );
          });
        })
      );
    });

    it(`should respond and reject the range, if the given range is not in valid format`, function () {
      app.get('/', (req, res) => {
        return createFileServer(req, res).serve('/media/image.jpg');
      });

      return withTeardown(
        app,
        app.listen().then(() => {
          return sendRequest({
            uri: httpHost,
            headers: {
              Range: `a-`,
            },
          }).then((res) => {
            expect(res.statusCode).toEqual(416);
            expect(res.headers).toHaveProperty(
              'content-range',
              `bytes */${size}`
            );
          });
        })
      );
    });

    it(`should send everything for valid multi range requests, as we don't support
            it yet`, function () {
      app.get('/', (req, res) => {
        return createFileServer(req, res).serve('/media/image.jpg');
      });

      return withTeardown(
        app,
        app.listen().then(() => {
          return sendRequest({
            uri: httpHost,
            headers: {
              Range: `0-999, 2000-2999`,
            },
          }).then((res) => {
            expect(res.statusCode).toEqual(206);

            expect(res.headers).toHaveProperty(
              'content-range',
              `bytes 0-${size - 1}/${size}`
            );
          });
        })
      );
    });

    it(`should respond to if-range conditional request, sending the range if content
            negotiation succeeds`, function () {
      app.get('/', (req, res) => {
        return createFileServer(req, res).serve('/media/image.jpg');
      });

      return withTeardown(
        app,
        app.listen().then(() => {
          return sendRequest({ uri: httpHost }).then((res) => {
            expect(res.statusCode).toEqual(200);
            const headers = {
              'If-Range': res.headers.etag,
              Range: '0-999',
            };

            return sendRequest({ uri: httpHost, headers }).then((res) => {
              expect(res.statusCode).toEqual(206);
              expect(res.headers['content-range']).toEqual(
                `bytes 0-999/${size}`
              );
              expect(res.headers['content-length']).toEqual(`1000`);
            });
          });
        })
      );
    });

    it(`should respond to if-range conditional request, sending the whole content on a 200
            status code if content negotiation fails`, function () {
      app.get('/', (req, res) => {
        return createFileServer(req, res).serve('/media/image.jpg');
      });

      return withTeardown(
        app,
        app.listen().then(() => {
          return sendRequest({ uri: httpHost }).then((res) => {
            expect(res.statusCode).toEqual(200);
            const headers = {
              'If-Range': 'unknown',
              Range: '0-999',
            };

            return sendRequest({ uri: httpHost, headers }).then((res) => {
              expect(res.statusCode).toEqual(200);
              expect(res.headers['content-range']).toBeUndefined();
              expect(res.headers['content-length']).toEqual(`${size}`);
            });
          });
        })
      );
    });
  });
});
