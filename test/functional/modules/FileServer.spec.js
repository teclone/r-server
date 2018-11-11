import RServer from '../../../src/main';
import request from 'request';
import path from 'path';
import fs from 'fs';
import sinon from 'sinon';

describe('FileServer Module', function() {
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

            request.options(host, (err, res) => {
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
});