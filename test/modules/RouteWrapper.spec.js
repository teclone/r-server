import RouteWrapper from '../../src/modules/RouteWrapper.js';
import Router from '../../src/modules/Router.js';

describe('RouteWrapper', function() {
    let routeWrapper = null,
        router = null;

    beforeEach(function() {
        router = new Router(false);
        routeWrapper = new RouteWrapper(router, '/user');
    });

    describe('#constructor(router, url)', function() {
        it(`should create a RouteWrapper instance when called`, function() {
            expect(routeWrapper).to.be.a('RouteWrapper');
        });

        it(`should initialize the router property to the given router argument`, function() {
            expect(routeWrapper.router).to.equals(router);
        });

        it(`should initialize the url property to the given url argument`, function() {
            expect(routeWrapper.url).to.equals('/user');
        });
    });

    describe('#options(callback, options?)', function() {
        it(`should call the router's options method, passing in the instance url, the callback
        parameter and options parameter, and return the this object`, function() {
            let callback = function() {}, options = {};

            expect(routeWrapper.options(callback, options)).to.equals(routeWrapper);
            expect(router.routes.options).to.be.lengthOf(1).and.to.satisfy(function(routes) {
                let route = routes[0];
                return route[0] === '/user' && route[1] === callback && route[2] === options;
            });
        });
    });

    describe('#head(callback, options?)', function() {
        it(`should call the router's head method, passing in the instance url, the callback
        parameter and options parameter and return the this object`, function() {
            let callback = function() {}, options = {};

            expect(routeWrapper.head(callback, options)).to.equals(routeWrapper);
            expect(router.routes.head).to.be.lengthOf(1).and.to.satisfy(function(routes) {
                let route = routes[0];
                return route[0] === '/user' && route[1] === callback && route[2] === options;
            });
        });
    });

    describe('#get(callback, options?)', function() {
        it(`should call the router's get method, passing in the instance url, the callback
        parameter and options parameter, and return the this object`, function() {
            let callback = function() {}, options = {};

            expect(routeWrapper.get(callback, options)).to.equals(routeWrapper);
            expect(router.routes.get).to.be.lengthOf(1).and.to.satisfy(function(routes) {
                let route = routes[0];
                return route[0] === '/user' && route[1] === callback && route[2] === options;
            });
        });
    });

    describe('#post(callback, options?)', function() {
        it(`should call the router's post method, passing in the instance url, the callback
        parameter and options parameter, and return the this object`, function() {
            let callback = function() {}, options = {};

            expect(routeWrapper.post(callback, options)).to.equals(routeWrapper);
            expect(router.routes.post).to.be.lengthOf(1).and.to.satisfy(function(routes) {
                let route = routes[0];
                return route[0] === '/user' && route[1] === callback && route[2] === options;
            });
        });
    });

    describe('#put(callback, options?)', function() {
        it(`should call the router's put method, passing in the instance url, the callback
        parameter and options parameter, and return the this object`, function() {
            let callback = function() {}, options = {};

            expect(routeWrapper.put(callback, options)).to.equals(routeWrapper);
            expect(router.routes.put).to.be.lengthOf(1).and.to.satisfy(function(routes) {
                let route = routes[0];
                return route[0] === '/user' && route[1] === callback && route[2] === options;
            });
        });
    });

    describe('#delete(callback, options?)', function() {
        it(`should call the router's delete method, passing in the instance url, the callback
        parameter and options parameter, and return the this object`, function() {
            let callback = function() {}, options = {};

            expect(routeWrapper.delete(callback, options)).to.equals(routeWrapper);
            expect(router.routes.delete).to.be.lengthOf(1).and.to.satisfy(function(routes) {
                let route = routes[0];
                return route[0] === '/user' && route[1] === callback && route[2] === options;
            });
        });
    });

    describe('#all(callback, options?)', function() {
        it(`should call the router's all method, passing in the instance url, the callback
        parameter and options parameter, and return the this object`, function() {
            let callback = function() {}, options = {};

            expect(routeWrapper.all(callback, options)).to.equals(routeWrapper);
            expect(router.routes.all).to.be.lengthOf(1).and.to.satisfy(function(routes) {
                let route = routes[0];
                return route[0] === '/user' && route[1] === callback && route[2] === options;
            });
        });
    });
});