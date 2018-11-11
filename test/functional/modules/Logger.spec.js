import RServer from '../../../src/main';
import request from 'request';
import sinon from 'sinon';


describe('Logger Module', function() {
    /**
     *@type {App}
    */
    let app = null,
        host = '';

    before(function() {
        host = 'http://localhost:4000/';
    });

    beforeEach(function(done) {
        app = RServer.instance({env: 'development', profileRequest: true});
        app.listen(null, () => {
            done();
        });
    });

    afterEach(function(done) {
        app.close(() => {
            done();
        });
    });

    describe('#profile(req, res)', function() {
        it(`should log request response profile to the console if in development mode and the
        profileRequest config option is set to true`, function(done) {
            sinon.spy(console, 'log');
            app.get('/send-json', (req, res) => {
                return res.setHeaders({'x-name': 'harrison', 'x-age': '22'}).end();
            });

            request.get(host + 'send-json', () => {
                expect(console.log.called).to.be.true;
                console.log.restore();
                done();
            });
        });

        it(`should use red chalk when logging responses whose status code is equal to or greater
        than 400`, function(done) {
            sinon.spy(console, 'log');
            request.get(host + 'index.xml', (err, res) => {
                expect(res.statusCode).to.equals(404);
                console.log.restore();
                done();
            });
        });
    });

    describe('#fatal({stack}, res, errorCode)', function() {
        it(`should log the error stack and respond with status code of 200 if not given when
        running in development mode`, function(done) {
            sinon.spy(app.server.logger, 'fatal');
            app.get('/throw', () => {
                throw new Error('something went bad');
            });

            request.get(host + 'throw', (err, res) => {
                expect(res.statusCode).to.equals(200);
                expect(app.server.logger.fatal.called).to.be.true;
                app.server.logger.fatal.restore();
                done();
            });
        });

        it(`should respond with error code of 500 if running in production mode`, function(done) {

            app.server.config.env = 'production';
            sinon.spy(app.server.logger, 'fatal');

            app.get('/throw', () => {
                throw new Error('something went bad');
            });

            request.get(host + 'throw', (err, res) => {
                expect(res.statusCode).to.equals(500);
                expect(app.server.logger.fatal.called).to.be.true;
                app.server.logger.fatal.restore();
                done();
            });
        });
    });
});