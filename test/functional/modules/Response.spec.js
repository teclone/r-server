import RServer from '../../../src/main';
import fs from 'fs';
import path from 'path';
import request from 'request';


describe('Functional: Response Module', function() {
    /**
     *@type {App}
    */
    let app = null,
        host = '';

    before(function() {
        host = 'http://localhost:4000/';
    });

    beforeEach(function(done) {
        app = RServer.instance();
        app.listen(null, () => {
            done();
        });
    });

    afterEach(function(done) {
        app.close(() => {
            done();
        });
    });

    describe('#setHeaders(headers)', function() {
        it(`should call setHeader for every header name:value pair in the headers object. It
        should be chainable`, function(done) {
            app.get('/send-json', (req, res) => {
                return res.setHeaders({'x-name': 'harrison', 'x-age': '22'}).end();
            });

            request.get(host + 'send-json', (err, res) => {
                expect(res.headers['x-name']).to.equals('harrison');
                expect(res.headers['x-age']).to.equals('22');
                done();
            });
        });

        it(`should call do nothing if argument is not a plain object`, function(done) {
            app.get('/send-json', (req, res) => {
                return res.setHeaders(null).end();
            });

            request.get(host + 'send-json', (err, res) => {
                expect(res.headers['x-name']).to.be.undefined;
                done();
            });
        });
    });

    describe('#status(statusCode)', function() {
        it(`should set the response status code to the given value`, function(done) {
            app.get('/test-status', (req, res) => {
                return res.status(201).end();
            });

            request.get(host + 'test-status', (err, res) => {
                expect(res.statusCode).to.equals(201);
                done();
            });
        });
    });

    describe('#json(data?)', function() {
        it(`should stringify the json object and send json response back to the client`, function(done) {
            app.get('/send-json', (req, res) => {
                return res.json({status: 'success'});
            });

            request.get(host + 'send-json', (err, res) => {
                expect(res.headers['content-type']).to.equals('application/json');
                done();
            });
        });

        it(`should skip stringifying the argument if it is already a string`, function(done) {
            const json = '{"actions": ["cook", "eat", "bath"]}';
            app.get('/send-json', (req, res) => {
                return res.json(json);
            });

            request.get(host + 'send-json', (err, res, body) => {
                expect(res.headers['content-type']).to.equals('application/json');
                expect(body).to.equals(json);
                done();
            });
        });
    });

    describe('#redirect(path, status)', function() {
        it(`should redirect the client to the given path, using the given status code`, function(done) {
            app.get('/redirect', (req, res) => {
                return res.redirect('/index.html', 301);
            });

            request.get(host + 'redirect', (err, res, body) => {
                expect(body).to.equal(
                    fs.readFileSync(path.resolve(__dirname, '../../../public/index.html')).toString()
                );
                done();
            });
        });

        it(`should default the status code to 302 if not given`, function(done) {
            app.get('/redirect', (req, res) => {
                return res.redirect('/index.html');
            });

            request.get(host + 'redirect', (err, res, body) => {
                expect(body).to.equal(
                    fs.readFileSync(path.resolve(__dirname, '../../../public/index.html')).toString()
                );
                done();
            });
        });
    });

    describe('#download(filePath, filename)', function() {
        it(`should call FileServer#serveDownload method to send the content of the file specified by the relative file path back to the
        client for download. It should also suggest that the client saves the file using the given
        file name`, function(done) {
            app.get('/send-download', (req, res) => {
                return res.download('package.json', 'package.json');
            });

            request.get(host + 'send-download', (err, res, body) => {
                expect(res.headers['content-disposition']).to.equals('attachment; filename="package.json"');
                expect(body).to.equal(
                    fs.readFileSync(path.resolve(__dirname, '../../../package.json')).toString()
                );
                done();
            });
        });

        it(`should call FileServer#serveDownload method to send the content of the file specified by the relative file path back to the
        client for download. filename should default to file's base name if not given`, function(done) {
            app.get('/send-download', (req, res) => {
                return res.download('package.json');
            });

            request.get(host + 'send-download', (err, res, body) => {
                expect(res.headers['content-disposition']).to.equals('attachment; filename="package.json"');
                expect(body).to.equal(
                    fs.readFileSync(path.resolve(__dirname, '../../../package.json')).toString()
                );
                done();
            });
        });
    });
});