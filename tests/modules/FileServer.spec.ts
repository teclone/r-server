import FileServer from '../../src/modules/FileServer';
import App from '../../src/modules/App';
import Logger from '../../src/modules/Logger';
import {
  entryPath,
  httpHost,
  closeServer,
  resolvePath
} from '../helpers/index';
import request from 'request';
import * as fs from 'fs';
import { ALLOWED_METHODS } from '../../src/modules/Constants';

describe(`FileServer`, function() {
  let app: App = null;
  let fileApp: FileServer = null;
  let logger: Logger = null;

  beforeEach(function() {
    app = new App({});
    logger = new Logger(entryPath, app.getConfig());
    fileApp = new FileServer(entryPath, app.getConfig(), logger);
  });

  describe(`serve(url: Url, method: Method, request: Request,
        response: Response): Promise<boolean>`, function() {
    it(`should respond to get requests made on public static files, serving such file
            back to the client`, function(done) {
      app.get('/', (req, res) => {
        return fileApp.serve('/index.html', req, res);
      });
      app.listen(null, () => {
        request.get(httpHost, (err, res, body) => {
          expect(body).toEqual(
            fs.readFileSync(resolvePath('public/index.html'), 'utf8')
          );
          closeServer(app, done);
        });
      });
    });

    it(`should respond to options requests made on public static files, responding with
            allow header`, function(done) {
      app.options('/', (req, res) => {
        return fileApp.serve('/index.html', req, res);
      });
      app.listen(null, () => {
        request.options(httpHost, (err, res) => {
          expect(res.headers).toHaveProperty(
            'allow',
            ALLOWED_METHODS.join(',')
          );
          closeServer(app, done);
        });
      });
    });

    it(`should respond to head requests made on public static files, responding with
            header information about the file`, function(done) {
      app.head('/', (req, res) => {
        return fileApp.serve('/index.html', req, res);
      });
      app.listen(null, () => {
        request.head(httpHost, (err, res) => {
          expect(res.headers).toHaveProperty('content-type', 'text/html');
          expect(res.headers).toHaveProperty('accept-ranges', 'bytes');
          expect(res.headers).toHaveProperty('content-length');
          expect(res.headers).toHaveProperty('etag');
          expect(res.headers).toHaveProperty('last-modified');
          closeServer(app, done);
        });
      });
    });

    it(`should search for a default document if specified path maps to a folder`, function(done) {
      app.get('/', (req, res) => {
        return fileApp.serve('/', req, res);
      });
      app.listen(null, () => {
        request.get(httpHost, (err, res, body) => {
          expect(body).toEqual(
            fs.readFileSync(resolvePath('public/index.html'), 'utf8')
          );
          closeServer(app, done);
        });
      });
    });

    it(`should do nothing and resolve to false if request method is neither get, head nor options
            method`, function(done) {
      app.post('/', (req, res) => {
        return fileApp.serve('/index.html', req, res).then(status => {
          if (status === false) {
            return res.end('correct');
          } else {
            return true;
          }
        });
      });
      app.listen(null, () => {
        request.post(httpHost, (err, res, body) => {
          expect(body).toEqual('correct');
          closeServer(app, done);
        });
      });
    });

    it(`should do nothing and resolve to false if specified file does not exist or if it
            maps to a folder that has no default document`, function(done) {
      app.get('/', (req, res) => {
        return fileApp.serve('/media', req, res).then(status => {
          if (status === false) {
            return res.end('correct');
          } else {
            return true;
          }
        });
      });
      app.listen(null, () => {
        request.get(httpHost, (err, res, body) => {
          expect(body).toEqual('correct');
          closeServer(app, done);
        });
      });
    });

    it(`should do nothing and resolve to false if specified file maps to a hidden path and
            serveHiddenFiles config option is set to false`, function(done) {
      app.get('/', (req, res) => {
        return fileApp.serve('/.gitignore', req, res).then(status => {
          if (status === false) {
            return res.end('correct');
          } else {
            return true;
          }
        });
      });
      app.listen(null, () => {
        request.get(httpHost, (err, res, body) => {
          expect(body).toEqual('correct');
          closeServer(app, done);
        });
      });
    });

    it(`should serve hidden files if serveHiddenFiles config option is set to true`, function(done) {
      const app = new App({ serveHiddenFiles: true });
      const fileApp = new FileServer(entryPath, app.getConfig(), logger);

      app.get('/', (req, res) => {
        return fileApp.serve('/.gitignore', req, res);
      });
      app.listen(null, () => {
        request.get(httpHost, (err, res, body) => {
          expect(body).toEqual(
            fs.readFileSync(resolvePath('public/.gitignore'), 'utf8')
          );
          closeServer(app, done);
        });
      });
    });

    it(`should respond with 304 response header to get requests made on public static files,
            if file is not modified since it was last served to the client using the sent
            if-none-match header`, function(done) {
      app.get('/', (req, res) => {
        return fileApp.serve('/index.html', req, res);
      });
      app.listen(null, () => {
        request.get(httpHost, (err, res, body) => {
          expect(res.statusCode).toEqual(200);
          const headers = {
            'if-none-match': res.headers['etag']
          };
          request.get(httpHost, { headers }, (err, res, body) => {
            expect(res.statusCode).toEqual(304);
            closeServer(app, done);
          });
        });
      });
    });

    it(`should respond with 304 response header to get requests made on public static files,
            if file is not modified since it was last served to the client using the sent
            if-modified-since header`, function(done) {
      app.get('/', (req, res) => {
        return fileApp.serve('/index.html', req, res);
      });
      app.listen(null, () => {
        request.get(httpHost, (err, res, body) => {
          expect(res.statusCode).toEqual(200);
          const headers = {
            'if-modified-since': res.headers['last-modified']
          };
          request.get(httpHost, { headers }, (err, res, body) => {
            expect(res.statusCode).toEqual(304);
            closeServer(app, done);
          });
        });
      });
    });
  });

  describe(`serveHttpErrorFile(method: Method, request: Request,
        response: Response, status: number): Promise<boolean>`, function() {
    it(`should serve the user defined http error file for the given status code`, function(done) {
      const file = 'tests/helpers/404.html';
      const app = new App({
        httpErrors: {
          404: file
        }
      });
      const fileApp = new FileServer(entryPath, app.getConfig(), logger);

      app.get('/', (req, res) => {
        return fileApp.serveHttpErrorFile(res, 404);
      });

      app.listen(null, () => {
        request.get(httpHost, (err, res, body) => {
          expect(res.statusCode).toEqual(404);
          expect(body).toEqual(fs.readFileSync(resolvePath(file), 'utf8'));
          closeServer(app, done);
        });
      });
    });

    it(`should default to its internal http error file if there is none defined for the
            given status code by the user`, function(done) {
      app.get('/', (req, res) => {
        return fileApp.serveHttpErrorFile(res, 404);
      });

      app.listen(null, () => {
        request.get(httpHost, (err, res, body) => {
          expect(res.statusCode).toEqual(404);
          expect(body).toEqual(
            fs.readFileSync(resolvePath('src/httpErrors/404.html'), 'utf8')
          );
          closeServer(app, done);
        });
      });
    });

    it(`should simply end the response with no data sent if there is no http file for the
            given status code`, function(done) {
      app.get('/', (req, res) => {
        return fileApp.serveHttpErrorFile(res, 500);
      });

      app.listen(null, () => {
        request.get(httpHost, (err, res, body) => {
          expect(res.statusCode).toEqual(500);
          expect(body).toEqual('');
          closeServer(app, done);
        });
      });
    });
  });

  describe(`serveDownload(request: Request, response: Response, filePath: string,
        filename?: string): Promise<boolean>`, function() {
    it(`should respond to options, get, and head requests on the given resource, sending
            the file as download attachment to the client`, function(done) {
      const file = 'public/media/image.jpg';
      app.get('/', (req, res) => {
        return fileApp.serveDownload(req, res, file, 'preview.jpg');
      });

      app.listen(null, () => {
        request.get(httpHost, (err, res, body) => {
          expect(res.headers).toHaveProperty(
            'content-disposition',
            'attachment; filename="preview.jpg"'
          );
          closeServer(app, done);
        });
      });
    });

    it(`should generate a download suggested filename if not given, based on the file name`, function(done) {
      const file = 'public/media/image.jpg';
      app.get('/', (req, res) => {
        return fileApp.serveDownload(req, res, file);
      });

      app.listen(null, () => {
        request.get(httpHost, (err, res, body) => {
          expect(res.headers).toHaveProperty(
            'content-disposition',
            'attachment; filename="image.jpg"'
          );
          closeServer(app, done);
        });
      });
    });

    it(`should search public folders for the given files if file could not be
            resolved`, function(done) {
      const file = 'media/image.jpg';
      app.get('/', (req, res) => {
        return fileApp.serveDownload(req, res, file, 'preview.jpg');
      });

      app.listen(null, () => {
        request.get(httpHost, (err, res, body) => {
          expect(res.headers).toHaveProperty(
            'content-disposition',
            'attachment; filename="preview.jpg"'
          );
          closeServer(app, done);
        });
      });
    });

    it(`should reject with error if given file could not be found`, function(done) {
      const file = 'media/unknown.jpg';
      app.get('/', (req, res) => {
        return fileApp
          .serveDownload(req, res, file, 'preview.jpg')
          .catch(ex => {
            res.end('correct');
            return true;
          });
      });

      app.listen(null, () => {
        request.get(httpHost, (err, res, body) => {
          expect(body).toEqual('correct');
          closeServer(app, done);
        });
      });
    });
  });

  describe(`Range Request`, function() {
    const stat = fs.statSync(resolvePath('public/media/image.jpg'));
    const size = stat.size;

    it(`should respond and handle range requests, responding appropriately with the requested
        range of data`, function(done) {
      app.get('/', (req, res) => {
        return fileApp.serve('/media/image.jpg', req, res);
      });

      app.listen(null, () => {
        request.get(
          httpHost,
          {
            headers: {
              Range: '0-999'
            }
          },
          (err, res) => {
            expect(res.headers).toHaveProperty(
              'content-range',
              `bytes 0-999/${size}`
            );
            expect(res.headers).toHaveProperty('content-length', `1000`);
            closeServer(app, done);
          }
        );
      });
    });

    it(`should respond and handle range requests, sending the last suffix bytes as indicated
            by the given suffix-byte-range`, function(done) {
      app.get('/', (req, res) => {
        return fileApp.serve('/media/image.jpg', req, res);
      });

      app.listen(null, () => {
        request.get(
          httpHost,
          {
            headers: {
              Range: '-1000'
            }
          },
          (err, res) => {
            expect(res.headers).toHaveProperty(
              'content-range',
              `bytes ${size - 1000}-${size - 1}/${size}`
            );
            expect(res.headers).toHaveProperty('content-length', `1000`);
            closeServer(app, done);
          }
        );
      });
    });

    it(`should respond and handle range requests, sending the whole bytes if the given
            suffix-byte-range is not less than the file size`, function(done) {
      app.get('/', (req, res) => {
        return fileApp.serve('/media/image.jpg', req, res);
      });

      app.listen(null, () => {
        request.get(
          httpHost,
          {
            headers: {
              Range: `-${size + 1000}`
            }
          },
          (err, res) => {
            expect(res.headers).toHaveProperty(
              'content-range',
              `bytes 0-${size - 1}/${size}`
            );
            expect(res.headers).toHaveProperty('content-length', `${size}`);
            closeServer(app, done);
          }
        );
      });
    });

    it(`should respond and handle range requests, sending from the given beginning byte to the
            end of the file if there is no end byte specified`, function(done) {
      app.get('/', (req, res) => {
        return fileApp.serve('/media/image.jpg', req, res);
      });

      app.listen(null, () => {
        request.get(
          httpHost,
          {
            headers: {
              Range: '1000-'
            }
          },
          (err, res) => {
            expect(res.headers).toHaveProperty(
              'content-range',
              `bytes 1000-${size - 1}/${size}`
            );
            expect(res.headers).toHaveProperty(
              'content-length',
              `${size - 1000}`
            );
            closeServer(app, done);
          }
        );
      });
    });

    it(`should respond and reject the range, if the ending range byte is less than the
            beginning byte`, function(done) {
      app.get('/', (req, res) => {
        return fileApp.serve('/media/image.jpg', req, res);
      });

      app.listen(null, () => {
        request.get(
          httpHost,
          {
            headers: {
              Range: '1000-500'
            }
          },
          (err, res) => {
            expect(res.statusCode).toEqual(416);
            expect(res.headers).toHaveProperty(
              'content-range',
              `bytes */${size}`
            );
            closeServer(app, done);
          }
        );
      });
    });

    it(`should respond and reject the range, if the given suffix range byte is a zero length
            byte`, function(done) {
      app.get('/', (req, res) => {
        return fileApp.serve('/media/image.jpg', req, res);
      });

      app.listen(null, () => {
        request.get(
          httpHost,
          {
            headers: {
              Range: '-0'
            }
          },
          (err, res) => {
            expect(res.statusCode).toEqual(416);
            expect(res.headers).toHaveProperty(
              'content-range',
              `bytes */${size}`
            );
            closeServer(app, done);
          }
        );
      });
    });

    it(`should respond and reject the range, if the given beginning range byte is not
            less than file size`, function(done) {
      app.get('/', (req, res) => {
        return fileApp.serve('/media/image.jpg', req, res);
      });

      app.listen(null, () => {
        request.get(
          httpHost,
          {
            headers: {
              Range: `${size}-`
            }
          },
          (err, res) => {
            expect(res.statusCode).toEqual(416);
            expect(res.headers).toHaveProperty(
              'content-range',
              `bytes */${size}`
            );
            closeServer(app, done);
          }
        );
      });
    });

    it(`should respond and reject the range, if the given range is not in valid format`, function(done) {
      app.get('/', (req, res) => {
        return fileApp.serve('/media/image.jpg', req, res);
      });

      app.listen(null, () => {
        request.get(
          httpHost,
          {
            headers: {
              Range: `a-`
            }
          },
          (err, res) => {
            expect(res.statusCode).toEqual(416);
            expect(res.headers).toHaveProperty(
              'content-range',
              `bytes */${size}`
            );
            closeServer(app, done);
          }
        );
      });
    });

    it(`should send everything for valid multi range requests, as we don't support
            it yet`, function(done) {
      app.get('/', (req, res) => {
        return fileApp.serve('/media/image.jpg', req, res);
      });

      app.listen(null, () => {
        request.get(
          httpHost,
          {
            headers: {
              Range: `0-999, 2000-2999`
            }
          },
          (err, res) => {
            expect(res.statusCode).toEqual(206);
            expect(res.headers).toHaveProperty(
              'content-range',
              `bytes 0-${size - 1}/${size}`
            );
            closeServer(app, done);
          }
        );
      });
    });

    it(`should respond to if-range conditional request, sending the range if content
            negotiation succeeds`, function(done) {
      app.get('/', (req, res) => {
        return fileApp.serve('/media/image.jpg', req, res);
      });

      app.listen(null, () => {
        request.get(httpHost, (err, res) => {
          expect(res.statusCode).toEqual(200);
          const headers = {
            'If-Range': res.headers.etag,
            Range: '0-999'
          };
          request.get(httpHost, { headers }, (err, res) => {
            expect(res.statusCode).toEqual(206);
            expect(res.headers['content-range']).toEqual(`bytes 0-999/${size}`);
            expect(res.headers['content-length']).toEqual(`1000`);
            closeServer(app, done);
          });
        });
      });
    });

    it(`should respond to if-range conditional request, sending the whole content on a 200
            status code if content negotiation fails`, function(done) {
      app.get('/', (req, res) => {
        return fileApp.serve('/media/image.jpg', req, res);
      });

      app.listen(null, () => {
        request.get(httpHost, (err, res) => {
          expect(res.statusCode).toEqual(200);
          const headers = {
            'If-Range': 'unknown',
            Range: '0-999'
          };
          request.get(httpHost, { headers }, (err, res) => {
            expect(res.statusCode).toEqual(200);
            expect(res.headers['content-range']).toBeUndefined();
            expect(res.headers['content-length']).toEqual(`${size}`);
            closeServer(app, done);
          });
        });
      });
    });
  });

  describe(`Readstream Error Handling`, function() {
    it(`should handle readstream error when reading from files such as no read permission, etc
            logging a fatal message to the error log file and responding accordingly`, function(done) {
      app.get('/', (req, res) => {
        return fileApp.serveDownload(req, res, 'tests/helpers/unreadable.txt');
      });
      app.listen(null, () => {
        request.get(httpHost, (err, res, body) => {
          closeServer(app, done);
        });
      });
    });
  });
});
