import RServer from '../../../src/main';
import Router from '../../../src/modules/Router';

describe('Functional: Server Module', function() {
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

    describe('Request Data Handling', function() {
        it(`should process request data and make it available`, function(done) {
            const form = {
                name: 'Harrison',
                password: 'passwd_243'
            };
            app.all('/process-data', (req, res) => {
                return res.json(req.body);
            });

            request.debug = true;
            request.post(host + 'process-data', {form}, (err, res, body) => {
                request.debug = false;
                expect(JSON.parse(body)).to.deep.equals(form);
                done();
            });
        });

        it(`should send 413 error code if request data exceeds server maxBufferSize config value`, function(done) {
            app.server.config.maxBufferSize = 10;
            const form = {
                name: 'Harrison',
                password: 'passwd_243'
            };
            app.post('/process-data', (req, res) => {
                return res.json(req.body);
            });

            request.post(host + 'process-data', {form}, (err, res) => {
                expect(res.statusCode).to.equals(413);
                done();
            });
        });
    });

    describe('mounted Routes', function() {
        it(`should also include mounted routes while handling routes`, function(done) {
            const form = {
                name: 'Harrison',
                password: 'passwd_243'
            };
            const router = new Router(true);

            router.post('/login', (req, res) => {
                res.json({status: 'success'});
            });
            app.mount('auth', router);

            request.post(host + 'auth/login', {form}, (err, res, body) => {
                expect(JSON.parse(body)).to.deep.equals({status: 'success'});
                done();
            });
        });

        it(`should also include mounted routes while handling routes, running all
        routes api first`, function(done) {
            const form = {
                name: 'Harrison',
                password: 'passwd_243'
            };
            const router = new Router(false);

            router.all('/signup', (req, res) => {
                res.json({status: 'success'});
            });

            router.all('/login', (req, res) => {
                res.json({status: 'success'});
            });
            app.mount('auth', router);

            request.post(host + 'auth/login', {form}, (err, res, body) => {
                expect(JSON.parse(body)).to.deep.equals({status: 'success'});
                done();
            });
        });
    });

    describe('enforce https', function() {
        it(`should enforce https by redirecting all http traffic to the
        https address`, function(done) {
            const app = RServer.instance({https: {enabled: true, enforce: true}});

            app.get('/say-protocol', (req, res) => {
                res.end(req.isHttps? 'https' : 'http');
            });

            app.listen(6000, function() {
                request('http://localhost:6000/say-protocol', {rejectUnauthorized: false}, (err, res, body) => {
                    expect(body).to.equals('https');
                    app.close(() => {
                        done();
                    });
                });
            });
        });
    });
});