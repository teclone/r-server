import App from '../../src/modules/App';
import request from 'request';
import { httpHost, closeServer } from '../helpers';

describe('Response', function() {
  let app: App = null;

  beforeEach(() => {
    app = new App({});
  });

  describe(`#end(data?, encoding?: string): Promise<boolean>`, function() {
    it(`should end the response and return a promise which resolves to true`, function(done) {
      app.get('/', (req, res) => {
        return res.end().then(result => {
          expect(result).toEqual(true);
          return true;
        });
      });
      app.listen(null, () => {
        request(httpHost, (err, res, body) => {
          closeServer(app, done);
          expect(body).toEqual('');
        });
      });
    });

    it(`can accept a data string or buffer to send back to client`, function(done) {
      app.get('/', (req, res) => {
        return res.end('got it');
      });
      app.listen(null, () => {
        request(httpHost, (err, res, body) => {
          closeServer(app, done);
          expect(body).toEqual('got it');
        });
      });
    });

    it(`can accept data encoding as second argument`, function(done) {
      app.get('/', (req, res) => {
        return res.end('got it', 'utf8');
      });
      app.listen(null, () => {
        request(httpHost, (err, res, body) => {
          closeServer(app, done);
          expect(body).toEqual('got it');
        });
      });
    });
  });

  describe(`#json(data: object | string): Promise<boolean>`, function() {
    const jsonObject = {
      name: 'Harrison'
    };
    const jsonString = JSON.stringify(jsonObject);

    it(`should send a json response back to the client`, function(done) {
      app.get('/', (req, res) => {
        return res.json(jsonString);
      });
      app.listen(null, () => {
        request(httpHost, (err, res, body) => {
          closeServer(app, done);
          expect(body).toEqual(jsonString);
        });
      });
    });

    it(`should automatically stringify the json object before sending`, function(done) {
      app.get('/', (req, res) => {
        return res.json(jsonObject);
      });
      app.listen(null, () => {
        request(httpHost, (err, res, body) => {
          closeServer(app, done);
          expect(body).toEqual(jsonString);
        });
      });
    });
  });

  describe(`#redirect(path: string, status: number = 302): Promise<boolean>`, function() {
    const users = [
      {
        id: 1,
        name: 'Harrison Ifeanyichukwu'
      },
      {
        id: 2,
        name: 'Kalle'
      }
    ];
    const stringifiedUsers = JSON.stringify(users);

    it(`should redirect the client to the new path`, function(done) {
      app.get('/', (req, res) => {
        return res.redirect('/users');
      });
      app.get('/users', (req, res) => {
        return res.json(users);
      });
      app.listen(null, () => {
        request(httpHost, (err, res, body) => {
          closeServer(app, done);
          expect(body).toEqual(stringifiedUsers);
        });
      });
    });
  });

  describe(`#download(filePath: string, filename?: string): Promise<boolean>`, function() {
    it(`should send a download attachment back to the client`, function(done) {
      app.get('/', (req, res) => {
        return res.download('media/image.jpg', 'preview.jpg');
      });
      app.listen(null, () => {
        request(httpHost, (err, res, body) => {
          closeServer(app, done);
          expect(res.headers).toHaveProperty('content-disposition');
        });
      });
    });
  });
});
