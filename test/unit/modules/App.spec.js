import App from '../../../src/modules/App.js';
import Router from '../../../src/modules/Router.js';
import sinon from 'sinon';

describe('App', function() {
    let app = null;

    this.beforeEach(function() {
        app = new App('.rsvrc.json');
    });

    describe('#constructor(config?)', function() {
        it(`should create an App instance`, function() {
            expect(app).to.be.an('App');
        });

        it(`should initialize the server property with an RServer instance`, function() {
            expect(app.server).to.be.an('RServer');
        });
    });

    describe('#options(url, callback, options)', function() {
        it(`should call the server.router.options method, passing in the whole argument`, function() {
            sinon.spy(app.server.router, 'options');
            const callback = () => {};
            app.options('/', callback, null);

            expect(app.server.router.options.called).to.be.true;
            expect(app.server.router.options.getCall(0).args[0]).to.equals('/');
            expect(app.server.router.options.getCall(0).args[1]).to.equals(callback);
            expect(app.server.router.options.getCall(0).args[2]).to.be.null;
        });
    });

    describe('#head(url, callback, options)', function() {
        it(`should call the server.router.head method, passing in the whole argument`, function() {
            sinon.spy(app.server.router, 'head');
            const callback = () => {};
            app.head('/', callback, null);

            expect(app.server.router.head.called).to.be.true;
            expect(app.server.router.head.getCall(0).args[0]).to.equals('/');
            expect(app.server.router.head.getCall(0).args[1]).to.equals(callback);
            expect(app.server.router.head.getCall(0).args[2]).to.be.null;
        });
    });

    describe('#get(url, callback, options)', function() {
        it(`should call the server.router.get method, passing in the whole argument`, function() {
            sinon.spy(app.server.router, 'get');
            const callback = () => {};
            app.get('/', callback, null);

            expect(app.server.router.get.called).to.be.true;
            expect(app.server.router.get.getCall(0).args[0]).to.equals('/');
            expect(app.server.router.get.getCall(0).args[1]).to.equals(callback);
            expect(app.server.router.get.getCall(0).args[2]).to.be.null;
        });
    });

    describe('#post(url, callback, options)', function() {
        it(`should call the server.router.post method, passing in the whole argument`, function() {
            sinon.spy(app.server.router, 'post');
            const callback = () => {};
            app.post('/', callback, null);

            expect(app.server.router.post.called).to.be.true;
            expect(app.server.router.post.getCall(0).args[0]).to.equals('/');
            expect(app.server.router.post.getCall(0).args[1]).to.equals(callback);
            expect(app.server.router.post.getCall(0).args[2]).to.be.null;
        });
    });

    describe('#put(url, callback, options)', function() {
        it(`should call the server.router.put method, passing in the whole argument`, function() {
            sinon.spy(app.server.router, 'put');
            const callback = () => {};
            app.put('/', callback, null);

            expect(app.server.router.put.called).to.be.true;
            expect(app.server.router.put.getCall(0).args[0]).to.equals('/');
            expect(app.server.router.put.getCall(0).args[1]).to.equals(callback);
            expect(app.server.router.put.getCall(0).args[2]).to.be.null;
        });
    });

    describe('#delete(url, callback, options)', function() {
        it(`should call the server.router.delete method, passing in the whole argument`, function() {
            sinon.spy(app.server.router, 'delete');
            const callback = () => {};
            app.delete('/', callback, null);

            expect(app.server.router.delete.called).to.be.true;
            expect(app.server.router.delete.getCall(0).args[0]).to.equals('/');
            expect(app.server.router.delete.getCall(0).args[1]).to.equals(callback);
            expect(app.server.router.delete.getCall(0).args[2]).to.be.null;
        });
    });

    describe('#all(url, callback, options)', function() {
        it(`should call the server.router.all method, passing in the whole argument`, function() {
            sinon.spy(app.server.router, 'all');
            const callback = () => {};
            app.all('/', callback, null);

            expect(app.server.router.all.called).to.be.true;
            expect(app.server.router.all.getCall(0).args[0]).to.equals('/');
            expect(app.server.router.all.getCall(0).args[1]).to.equals(callback);
            expect(app.server.router.all.getCall(0).args[2]).to.be.null;
        });
    });

    describe('#route(url)', function() {
        it(`should create and return a Route Wrapper`, function() {
            expect(app.route('user')).to.be.a('Wrapper');
        });
    });

    describe('#use(url, middleware, options)', function() {
        it(`should pass along the middleware to the server.router.use method`, function() {
            sinon.spy(app.server.router, 'use');
            const middleware = function() {};
            app.use('/', middleware);

            expect(app.server.router.use.called).to.be.true;
        });
    });

    describe('#mount(baseUrl, router)', function() {
        it(`should call the server mount method with the passed in argument`, function() {
            let router = new Router(true);
            sinon.spy(app.server, 'mount');
            app.mount('auth', router);

            expect(app.server.mount.called).to.be.true;
        });
    });

    describe('#listen(port?, callback?)', function() {
        it(`should start the server at the given port, calling the callback method once the
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
                expect(app.listening).to.be.true;
                app.close(function() {
                    expect(app.listening).to.be.false;
                    done();
                });
            });
        });
    });

    describe('#address()', function() {
        it(`should return the server's bound address, it returns null if the server is currently
        not listening for connections`, function(done) {
            app.listen(null, function() {
                expect(app.listening).to.be.true;
                expect(app.address().port).to.equals(4000);
                app.close(function() {
                    done();
                });
            });
        });
    });
});