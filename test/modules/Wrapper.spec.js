import Wrapper from '../../src/modules/Wrapper.js';
import Router from '../../src/modules/Router.js';

describe('Wrapper', function() {
    let wrapper = null,
        router = null;

    beforeEach(function() {
        router = new Router(false);
        wrapper = new Wrapper(router, '/user');
    });

    describe('#constructor(router, url)', function() {
        it(`should create a Wrapper instance when called`, function() {
            expect(wrapper).to.be.a('Wrapper');
        });

        it(`should initialize the router property to the given router argument`, function() {
            expect(wrapper.router).to.equals(router);
        });

        it(`should initialize the url property to the given url argument`, function() {
            expect(wrapper.url).to.equals('/user');
        });
    });

    describe('#options(callback, options?)', function() {
        it(`should call the router's options method, passing in the instance url, the callback
        parameter and options parameter, and return the this object`, function() {
            let callback = function() {}, options = {};

            expect(wrapper.options(callback, options)).to.equals(wrapper);
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

            expect(wrapper.head(callback, options)).to.equals(wrapper);
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

            expect(wrapper.get(callback, options)).to.equals(wrapper);
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

            expect(wrapper.post(callback, options)).to.equals(wrapper);
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

            expect(wrapper.put(callback, options)).to.equals(wrapper);
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

            expect(wrapper.delete(callback, options)).to.equals(wrapper);
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

            expect(wrapper.all(callback, options)).to.equals(wrapper);
            expect(router.routes.all).to.be.lengthOf(1).and.to.satisfy(function(routes) {
                let route = routes[0];
                return route[0] === '/user' && route[1] === callback && route[2] === options;
            });
        });
    });
});