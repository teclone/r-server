import App from '../../src/modules/App.js';
import Router from '../../src/modules/Router.js';

describe('App', function() {
    let app = null;

    this.beforeEach(function() {
        app = new App('.rsvrc.json');
    });

    describe('#constructor(configPath?)', function() {
        it(`should create an App instance`, function() {
            expect(app).to.be.an('App');
        });

        it(`should initialize the server property with an RServer instance`, function() {
            expect(app.server).to.be.an('RServer');
        });
    });

    describe('#options(url, callback, options)', function() {
        it(`should pass along the route to the server`, function() {
            let callback = () => {};
            app.options('/', callback, null);
            expect(app.server.router.routes.options).to.be.lengthOf(1)
                .and.to.satisfy(function(routes) {
                    let route = routes[0];
                    return route[0] === '/' && route[1] === callback && route[2] === null;
                });
        });
    });

    describe('#head(url, callback, options)', function() {
        it(`should pass along the route to the server`, function() {
            let callback = () => {};
            app.head('/', callback, null);
            expect(app.server.router.routes.head).to.be.lengthOf(1)
                .and.to.satisfy(function(routes) {
                    let route = routes[0];
                    return route[0] === '/' && route[1] === callback && route[2] === null;
                });
        });
    });

    describe('#get(url, callback, options)', function() {
        it(`should pass along the route to the server`, function() {
            let callback = () => {};
            app.get('/', callback, null);
            expect(app.server.router.routes.get).to.be.lengthOf(1)
                .and.to.satisfy(function(routes) {
                    let route = routes[0];
                    return route[0] === '/' && route[1] === callback && route[2] === null;
                });
        });
    });

    describe('#post(url, callback, options)', function() {
        it(`should pass along the route to the server`, function() {
            let callback = () => {};
            app.post('/', callback, null);
            expect(app.server.router.routes.post).to.be.lengthOf(1)
                .and.to.satisfy(function(routes) {
                    let route = routes[0];
                    return route[0] === '/' && route[1] === callback && route[2] === null;
                });
        });
    });

    describe('#put(url, callback, options)', function() {
        it(`should pass along the route to the server`, function() {
            let callback = () => {};
            app.put('/', callback, null);
            expect(app.server.router.routes.put).to.be.lengthOf(1)
                .and.to.satisfy(function(routes) {
                    let route = routes[0];
                    return route[0] === '/' && route[1] === callback && route[2] === null;
                });
        });
    });

    describe('#delete(url, callback, options)', function() {
        it(`should pass along the route to the server`, function() {
            let callback = () => {};
            app.delete('/', callback, null);
            expect(app.server.router.routes.delete).to.be.lengthOf(1)
                .and.to.satisfy(function(routes) {
                    let route = routes[0];
                    return route[0] === '/' && route[1] === callback && route[2] === null;
                });
        });
    });

    describe('#all(url, callback, options)', function() {
        it(`should pass along the route to the server`, function() {
            let callback = () => {};
            app.all('/', callback, null);
            expect(app.server.router.routes.all).to.be.lengthOf(1)
                .and.to.satisfy(function(routes) {
                    let route = routes[0];
                    return route[0] === '/' && route[1] === callback && route[2] === null;
                });
        });
    });

    describe('#route(url)', function() {
        it(`should create and return a Route Wrapper`, function() {
            expect(app.route('user')).to.be.a('Wrapper');
        });
    });

    describe('#use(middleware)', function() {
        it(`should pass along the middleware to the server`, function() {
            let middleware = () => {};
            app.use(middleware);
            expect(app.server.router.middlewares).to.be.lengthOf(1).to.satisfy(function(middlewares) {
                return middlewares[0] === middleware;
            });
        });
    });

    describe('#mount(baseUrl, router)', function() {
        it(`should mount the passed in router to the app`, function() {
            let router = new Router(true);

            router.get('login', () => {});
            router.post('login', () => {});

            router.get('signup', () => {});
            router.post('signup', () => {});

            app.mount('auth', router);
            expect(app.server.mountedRouters).to.be.lengthOf(1).to.satisfy(
                function(mountedRouters) {
                    return mountedRouters[0] === router;
                });
        });
    });

    describe('#listen(port?, callback?)', function() {
        it(`should start the server at the given port,  calling the callback method once the
        server gets started`, function(done) {
            app.listen(null, function() {
                app.close(function() {
                    done();
                });
            });
        });
    });

    describe('#close(callback?)', function() {
        it(`should close the server when called, calling the optional callback method once the
        server closes`, function(done) {
            app.listen(null, function() {
                app.close(function() {
                    if (app.listening)
                        done(new Error('Error: server not closed'));
                    else
                        done();
                });
            });
        });
    });

    describe('#address()', function() {
        it(`should return the server's bound address, it returns null if the server is currently
        not listening for connections`, function(done) {
            app.listen(null, function() {
                let address = app.address();
                app.close();
                if (address.port !== 4000)
                    done(new Error('Error: server address not valid'));
                else
                    done();
            });
        });
    });
});