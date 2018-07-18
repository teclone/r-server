import Util from '../../src/modules/Util.js';

describe('Util module', function() {
    describe('.isNumber(variable)', function() {
        it('should return true if argument is a number', function() {
            expect(Util.isNumber(3.2)).to.be.true;
            expect(Util.isNumber(-3.2)).to.be.true;
            expect(Util.isNumber(0)).to.be.true;
        });

        it('should return false if argument is not a number', function() {
            expect(Util.isNumber('3.2')).to.be.false;
            expect(Util.isNumber([1])).to.be.false;
            expect(Util.isNumber(NaN)).to.be.false;
        });
    });

    describe('.isCallable(variable)', function() {
        it('should return true if argument is a function', function() {
            expect(Util.isCallable(name => name)).to.be.true;
        });

        it('should return false if argument is not a function', function() {
            expect(Util.isCallable(new RegExp('a'))).to.be.false;
        });
    });

    describe('.isArray(variable)', function() {
        it('should return true if argument is an array', function() {
            expect(Util.isArray([])).to.be.true;
        });

        it('should return false if argument is not an array', function() {
            expect(Util.isArray({})).to.be.false;
            expect(Util.isArray('')).to.be.false;
        });
    });

    describe('.isObject(variable)', function() {
        it('should return true if argument is an object', function() {
            expect(Util.isObject({})).to.be.true;
            expect(Util.isObject([])).to.be.true;
        });

        it('should return false if argument is not an object', function() {
            expect(Util.isObject('')).to.be.false;
            expect(Util.isObject(null)).to.be.false;
            expect(Util.isObject(undefined)).to.be.false;
        });
    });

    describe('.isPlainObject(variable)', function() {
        it('should return true if argument is a plain object', function() {
            expect(Util.isPlainObject({})).to.be.true;
            expect(Util.isPlainObject(Object.create(null))).to.be.true;
        });

        it('should return false if argument is not a plain object', function() {
            expect(Util.isPlainObject([])).to.be.false;
            expect(Util.isPlainObject(this)).to.be.false;
            expect(Util.isPlainObject('')).to.be.false;
        });
    });

    describe('.isValidParameter(variable, excludeNulls?)', function() {
        it('should return true if argument is a valid function parameter. a valid function parameter is a parameter that is defined', function() {
            expect(Util.isValidParameter(3.2)).to.be.true;
        });

        it('should return false if argument is not a valid function parameter. a valid function parameter is a parameter that is defined', function() {
            expect(Util.isValidParameter(undefined)).to.be.false;
        });

        it('should accept a second boolean argument indicating if null arguments should be taken as invalid', function() {
            expect(Util.isValidParameter(null, true)).to.be.false;
        });
    });

    describe('.makeArray(arg, excludeNulls?)', function() {
        it('should create and return an array using the supplied argument', function() {
            expect(Util.makeArray(2)).to.deep.equals([2]);
        });

        it('should return the argument if it is already an array', function() {
            let arg = [];
            expect(Util.makeArray(arg)).to.equals(arg);
        });

        it('should return empty array if argument is not a valid parameter. i.e, if argument is undefined', function() {
            expect(Util.makeArray(undefined)).to.deep.equals([]);
        });
    });

    describe('.generateCallback(callback, scope?, parameters?)', function() {
        it('should throw error if argument one is not a function', function() {
            expect(function() {
                Util.generateCallback(null);
            }).to.throw('argument one is not a function');
        });

        it('should return a callback function', function() {
            expect(Util.generateCallback(function() {})).to.be.a('function');
        });

        it('should accept an optional execution scope object as a second argument', function() {
            let scope = {name: 'ForensicJS'},
            result = Util.generateCallback(function() {
                return this.name;
            }, scope)();
            expect(result).to.equals('ForensicJS');
        });

        it('should accept an optional parameter or array of parameters to pass in to executable during execution as a third argument', function() {
            let parameters = ['1.0.0', 'ForensicJS'],
            result = Util.generateCallback(function(version, name) {
                return {version, name};
            }, null, parameters)();
            expect(result.version).to.equals('1.0.0');
        });
    });

    describe('.camelCase(value, delimiter?)', function() {

        it('should apply camel like casing on the argument and return the result. default delimiter used is dash or underscore characters', function() {
            expect(Util.camelCase('my-dog')).to.equals('myDog');
        });

        it('should accept an optional delimiter string or regex pattern as a second argument', function() {
            expect(Util.camelCase('my dog is cool', ' ')).to.equals('myDogIsCool');
        });
    });

    describe('.getRandomText(length?)', function() {
        it('should return a random text of the given length. Default value of length is 4', function() {
            expect(Util.getRandomText(6)).to.be.a('string').and.lengthOf(6);
            expect(Util.getRandomText()).to.be.a('string').and.lengthOf(4);
        });
    });

    describe('.mergeObjects(...objects)', function() {

        it(`should deeply merge all the comma separated list of object arguments and return
        the new object`, function() {
            let obj1 = {name: 'house1', details: {height: 30, width: 40}};
            let obj2 = {nickName: 'Finest House', details: {rooms: 40}};
            let obj3 = {oldName: 'Fine House', details: {height: 35}};

            expect(Util.mergeObjects(obj1, obj2, obj3)).to.deep.equals({
                name: 'house1', nickName: 'Finest House', oldName: 'Fine House',
                details: {height: 35, width: 40, rooms: 40}
            });
        });

        it(`should ignore non plain object argument`, function() {
            let obj1 = {name: 'house1', details: {height: 30, width: 40}};
            let obj2 = {nickName: 'Finest House', details: {rooms: 40}};
            let obj3 = {oldName: 'Fine House', details: {height: 35}};

            expect(Util.mergeObjects(obj1, obj2, obj3, null)).to.deep.equals({
                name: 'house1', nickName: 'Finest House', oldName: 'Fine House',
                details: {height: 35, width: 40, rooms: 40}
            });
        });

        it(`should not override non object field with an object field`, function() {
            let obj1 = {name: 'house1', details: {height: 30, width: 40}};
            let obj2 = {nickName: 'Finest House', details: {rooms: 40}};
            let obj3 = {oldName: 'Fine House', details: {height: 35}};
            let obj4 = {name: {value: 'house2'}};

            expect(Util.mergeObjects(obj1, obj2, obj3, obj4)).to.deep.equals({
                name: 'house1', nickName: 'Finest House', oldName: 'Fine House',
                details: {height: 35, width: 40, rooms: 40}
            });
        });
    });
});