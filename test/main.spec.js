import main from '../src/main.js';

describe('main export', function() {
    describe('.instance(config)', function() {
        it('should return an RServer App instance', function() {
            expect(main.instance()).to.be.an('App');
        });
    });

    describe('.Router(inheritMiddlewares?)', function() {
        it('should return a mountable mini-app Router when called', function() {
            expect(main.Router()).to.be.a('Router');
        });

        it(`should take an optional boolean parameter that specifies if the router should
        middlewares for the main app when it is mounted. The default value is true if not
        specified`, function() {
            expect(main.Router(false)).to.be.a('Router');
        });
    });
});