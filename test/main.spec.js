import main from '../src/main.js';

describe('main export', function() {
    describe('.instance(configPath?)', function() {
        it('should return an RServerApp instance', function() {
            expect(main.instance()).to.be.an('RServerApp');
        });
    });
});