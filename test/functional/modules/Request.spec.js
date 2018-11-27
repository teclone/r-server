import RServer from '../../../src/main';
import request from 'request';


describe('Functional: Request Module', function() {
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

    describe('#hostname', function() {
        it(`should be the request host address name used without the port`, function(done) {
            app.get('/say-hostname', (req, res) => {
                return res.end(req.hostname);
            });

            request.get(host + 'say-hostname', (err, res, body) => {
                expect(body).to.equals('localhost');
                done();
            });
        });

        it(`should be empty string if the host header is not set`, function(done) {
            app.get('/say-hostname', (req, res) => {
                delete req.headers['host'];
                return res.end(req.hostname);
            });

            request.get(host + 'say-hostname', (err, res, body) => {
                expect(body).to.equals('');
                done();
            });
        });
    });
});