import RServerApp from '../../src/modules/RServerApp.js';

describe('RServerApp', function() {
    let rServerApp = null;

    this.beforeEach(function() {
        rServerApp = new RServerApp('.rsvrc.json');
    });

    describe('#constructor(configPath?)', function() {
        it(`should create an RServerApp instance`, function() {
            expect(rServerApp).to.be.an('RServerApp');
        });
    });

    describe('#route(baseUrl, callback, options)', function() {
        it(`should pass along the route to the server`, function() {
            rServerApp.route('/', () => {}, {});
            expect(rServerApp.server.routes[0].api).to.equals('route');
        });
    });

    describe('#get(baseUrl, callback, options)', function() {
        it(`should pass along the route to the server`, function() {
            rServerApp.get('/', () => {}, {});
            expect(rServerApp.server.routes[0].api).to.equals('get');
        });
    });

    describe('#post(baseUrl, callback, options)', function() {
        it(`should pass along the route to the server`, function() {
            rServerApp.post('/', () => {}, {});
            expect(rServerApp.server.routes[0].api).to.equals('post');
        });
    });

    describe('#head(baseUrl, callback, options)', function() {
        it(`should pass along the route to the server`, function() {
            rServerApp.head('/', () => {}, {});
            expect(rServerApp.server.routes[0].api).to.equals('head');
        });
    });

    describe('#put(baseUrl, callback, options)', function() {
        it(`should pass along the route to the server`, function() {
            rServerApp.put('/', () => {}, {});
            expect(rServerApp.server.routes[0].api).to.equals('put');
        });
    });

    describe('#delete(baseUrl, callback, options)', function() {
        it(`should pass along the route to the server`, function() {
            rServerApp.delete('/', () => {}, {});
            expect(rServerApp.server.routes[0].api).to.equals('delete');
        });
    });

    describe('#head(baseUrl, callback, options)', function() {
        it(`should pass along the route to the server`, function() {
            rServerApp.options('/', () => {}, {});
            expect(rServerApp.server.routes[0].api).to.equals('options');
        });
    });

    describe('#use(middleware)', function() {
        it(`should pass along the middleware to the server`, function() {
            let middleware = () => {};
            rServerApp.use(middleware);
            expect(rServerApp.server.middlewares[0]).to.equals(middleware);
        });
    });

    describe('#listen(port?)', function() {
        it(`should start the server at the given port`, function() {
            rServerApp.listen();
            expect(rServerApp.server.listening).to.be.true;
            rServerApp.close();
        });
    });

    describe('#close()', function() {
        it(`should close the server`, function() {
            rServerApp.listen();
            expect(rServerApp.server.listening).to.be.true;
            rServerApp.close();
            expect(rServerApp.server.listening).to.be.false;
        });
    });
});