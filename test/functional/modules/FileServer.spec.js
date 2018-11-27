import RServer from '../../../src/main';
import fs from 'fs';
import path from 'path';
import baseRequest from 'request';
import sinon from 'sinon';

describe('Functional: FileServer Module', function() {
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

    describe('#serveHttpErrorFile(response, status, baseDir, filePath)', function() {
        it(`should serve the user defined http error file if any`, function(done) {
            app.server.config.httpErrors['404'] = 'test/helpers/404.html';

            request.get(host + 'unknown.js', (err, res, body) => {
                console.log(err);
                expect(res.statusCode).to.equals(404);
                expect(body).to.equals(
                    fs.readFileSync(path.resolve(__dirname, '../../helpers/404.html')).toString()
                );
                done();
            });
        });

        it(`should serve send just the status and end the response if the given file does not
        exist`, function(done) {
            app.server.config.httpErrors['404'] = 'test/helper/404.html';

            request.get(host + 'unknown.js', (err, res, body) => {
                expect(res.statusCode).to.equals(404);
                expect(body).to.equals('');
                done();
            });
        });
    });

    describe('#serve(url, method, headers, response)', function() {
        it(`should service head request made on public files`, function(done) {

            request.head(host, (err, res) => {
                expect(res.statusCode).to.equals(200);
                done();
            });
        });

        it(`should service options request made on public files`, function(done) {

            baseRequest.options(host, {rejectUnauthorized: false}, (err, res) => {
                expect(res.statusCode).to.equals(200);
                done();
            });
        });

        it(`should negotiate content for get request made on public files`, function(done) {

            request.get(host, (err, res) => {
                expect(res.statusCode).to.equals(200);
                const eTag = res.headers['etag'];

                //make another request with the etag
                request.get({url: host, headers: {'if-none-match': eTag}}, (err, res, body) => {
                    expect(body).to.equals('');
                    expect(res.statusCode).to.equals(304);
                    done();
                });
            });
        });
    });

    describe('#serveDownload(response, filePath, filename)', function() {
        it(`should throw error if file does not exist`, function(done) {

            app.get('/serve-download', function(req, res) {
                return res.download('public/index.xml');
            });

            sinon.spy(app.server.logger, 'fatal');
            request.get(host + 'serve-download', (err, res) => {
                expect(app.server.logger.fatal.called).to.be.true;
                app.server.logger.fatal.restore();
                expect(res.statusCode).to.equals(200);
                done();
            });
        });
    });

    describe('Range request', function() {
        it(`should serve starting from the start point to the end of the file if range does not
        have endpoint specified, with status code 206`, function(done) {
            app.get('/serve-download', function(req, res) {
                return res.download('test/helpers/multipart.log');
            });

            request.get(host + 'serve-download', {
                headers: {
                    Range: 'bytes=0-'
                }
            }, (err, res) => {
                expect(res.statusCode).to.equals(206);
                done();
            });
        });

        it(`should serve the given range bytes only, with status code 206`, function(done) {
            app.get('/serve-download', function(req, res) {
                return res.download('test/helpers/multipart.log');
            });

            request.get(host + 'serve-download', {
                headers: {
                    Range: 'bytes=0-503'
                }
            }, (err, res) => {
                expect(res.statusCode).to.equals(206);
                done();
            });
        });

        it(`should send 416 error status code if range is not satisfiable`, function(done) {
            app.get('/serve-download', function(req, res) {
                return res.download('test/helpers/multipart.log');
            });

            request.get(host + 'serve-download', {
                headers: {
                    Range: 'bytes=12-503444444444'
                }
            }, (err, res) => {
                expect(res.statusCode).to.equals(416);
                done();
            });
        });

        it(`should send 416 error status code if range is not satisfiable`, function(done) {

            app.get('/serve-download', function(req, res) {
                return res.download('test/helpers/multipart.log');
            });

            request.get(host + 'serve-download', {
                headers: {
                    Range: 'bytes=12-503444444444'
                }
            }, (err, res) => {
                expect(res.statusCode).to.equals(416);
                done();
            });
        });

        it(`should server the whole document with status code of 200 if the if-range header is set
        but content negotiation failed`, function(done) {

            app.get('/serve-download', function(req, res) {
                return res.download('test/helpers/multipart.log');
            });

            request.get(host + 'serve-download', {
                headers: {
                    'If-Range': 'somehash',
                    Range: 'bytes=12-56'
                }
            }, (err, res) => {
                expect(res.statusCode).to.equals(200);
                done();
            });
        });

        it(`should server the requested range if the if-range header is set
        and content has not changed with status code 216`, function(done) {

            app.get('/serve-download', function(req, res) {
                return res.download('test/helpers/multipart.log');
            });

            request.get(host + 'serve-download', {
                headers: {
                    Range: 'bytes=12-56'
                }
            }, (err, res) => {
                const eTag = res.headers['etag'];
                request.get(host + 'serve-download', {
                    headers: {
                        'If-Range': eTag,
                        Range: 'bytes=12-56'
                    }
                }, (err, res) => {
                    expect(res.statusCode).to.equals(206);
                    done();
                });
            });
        });

        it(`should server the whole document if a multipart range request is recieved. as we
        do not support multipart range files at the moment.`, function(done) {

            app.get('/serve-download', function(req, res) {
                return res.download('test/helpers/multipart.log');
            });

            request.get(host + 'serve-download', {
                headers: {
                    Range: 'bytes=12-56, 57-90, 104-500'
                }
            }, (err, res) => {
                expect(res.statusCode).to.equals(200);
                done();
            });
        });
    });
});