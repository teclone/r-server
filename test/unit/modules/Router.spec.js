import Router from '../../../src/modules/Router.js';

describe('Router', function() {
    let router = null;

    beforeEach(function() {
        router = new Router();
    });

    describe('#constructor(inheritMiddlewares?)', function() {
        it(`should create a Router instance when called the optional inheritMiddlewares
        parameter`, function() {
            expect(router).to.be.a('Router');
        });

        it(`should set the inheritMiddlewares property to true if no parameter is given`, function() {
            expect(router.inheritMiddlewares).to.be.true;
        });

        it(`should set the inheritMiddlewares property to the boolean parameter if given`, function() {
            expect(new Router(false).inheritMiddlewares).to.be.false;
        });

        it(`should initialize the instance middlewares to an empty array`, function() {
            expect(router.middlewares).to.be.an('Array').and.lengthOf(0);
        });

        it(`should initialize the instance routes to an object containing empty arrays for all
        supported http method apis`, function() {
            expect(router.routes).to.deep.equals({
                options: [], head: [], get: [], post: [], put: [], delete: [], all: []});
        });
    });

    describe('#options(url, callback, options?)', function() {
        it(`should push the given route url, callback and optional options object to the
        routes options api store`, function() {
            const callback = function() {}, options = {};
            router.options('/', callback, options);
            expect(router.routes.options).to.be.lengthOf(1).and.to.satisfy(function(routes) {
                let route = routes[0];
                return route[0] === '/' && route[1] === callback && route[2] === options;
            });
        });

        it(`should resolve options to an object with the middleware key set to the given middleware callback
        if options argument is a callable`, function() {
            const callback = function() {}, options = () => {};
            router.options('/', callback, options);
            expect(router.routes.options).to.be.lengthOf(1).and.to.satisfy(function(routes) {
                let route = routes[0];
                return route[0] === '/' && route[1] === callback && route[2].middleware === options;
            });
        });
    });

    describe('#head(url, callback, options?)', function() {
        it(`should push the given route url, callback and optional options object to the
        routes head api store`, function() {
            let callback = function() {};
            router.head('/', callback);
            expect(router.routes.head).to.be.lengthOf(1).and.to.satisfy(function(routes) {
                let route = routes[0];
                return route[0] === '/' && route[1] === callback && route[2] === null;
            });
        });
    });

    describe('#get(url, callback, options?)', function() {
        it(`should push the given route url, callback and optional options object to the
        routes get api store`, function() {
            const callback = function() {}, options = {};
            router.get('/', callback, options);
            expect(router.routes.get).to.be.lengthOf(1).and.to.satisfy(function(routes) {
                let route = routes[0];
                return route[0] === '/' && route[1] === callback && route[2] === options;
            });
        });
    });

    describe('#post(url, callback, options?)', function() {
        it(`should push the given route url, callback and optional options object to the
        routes post api store`, function() {
            const callback = function() {}, options = {};
            router.post('/', callback, options);
            expect(router.routes.post).to.be.lengthOf(1).and.to.satisfy(function(routes) {
                let route = routes[0];
                return route[0] === '/' && route[1] === callback && route[2] === options;
            });
        });
    });

    describe('#put(url, callback, options?)', function() {
        it(`should push the given route url, callback and optional options object to the
        routes put api store`, function() {
            const callback = function() {}, options = {};
            router.put('/', callback, options);
            expect(router.routes.put).to.be.lengthOf(1).and.to.satisfy(function(routes) {
                let route = routes[0];
                return route[0] === '/' && route[1] === callback && route[2] === options;
            });
        });
    });

    describe('#delete(url, callback, options?)', function() {
        it(`should push the given route url, callback and optional options object to the
        routes delete api store`, function() {
            const callback = function() {}, options = {};
            router.delete('/', callback, options);
            expect(router.routes.delete).to.be.lengthOf(1).and.to.satisfy(function(routes) {
                let route = routes[0];
                return route[0] === '/' && route[1] === callback && route[2] === options;
            });
        });
    });

    describe('#all(url, callback, options?)', function() {
        it(`should push the given route url, callback and optional options object to the
        routes all api store`, function() {
            const callback = function() {}, options = {};
            router.all('/', callback, options);
            expect(router.routes.all).to.be.lengthOf(1).and.to.satisfy(function(routes) {
                let route = routes[0];
                return route[0] === '/' && route[1] === callback && route[2] === options;
            });
        });
    });

    describe('#route(url)', function() {
        it(`should return a Route Wrapper instance for the given url`, function() {
            expect(router.route('/user')).to.be.a('Wrapper');
        });
    });

    describe('#use(url, middleware, options)', function() {
        it(`should push the given middleware url callback to the instance middlewares array,
        defaulting the url to / if it is not a string`, function() {
            let middleware = function() {};
            router.use(null, middleware);
            router.use('/tests', middleware);

            expect(router.middlewares).to.be.lengthOf(2);
            expect(router.middlewares[0]).to.deep.equals(['/', middleware, null]);
            expect(router.middlewares[1]).to.deep.equals(['/tests', middleware, null]);
        });

        it(`should do nothing if argument is not a callable`, function() {
            router.use(null, {middleware: () => {}});

            expect(router.middlewares).to.be.lengthOf(0);
        });
    });
});