import Util from '../../src/modules/Util.js';
import fs from 'fs';
import path from 'path';
import rimraf from 'rimraf';

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

    describe('.makeObject(arg)', function() {
        it('should return an empty object if the given argument is not a plain object', function() {
            expect(Util.makeObject(null)).to.deep.equals({});
        });

        it('should return the argument if it is a plain object', function() {
            expect(Util.makeObject({})).to.deep.equals({});
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

    describe('.runSafe(executable, scope?, parameters?, runAfter?)', function() {
        it('should run the callback function safely by surpressing any runtime error', function() {
            expect(function() {
                Util.runSafe(function() {
                    throw new Error('this error should be surpressed');
                });
            }).to.not.throw();
        });

        it('should throw error if argument one is not a function', function() {
            expect(function() {
                Util.runSafe(null);
            }).to.throw('argument one is not a function');
        });

        it('should accept an optional execution scope object as a second argument', function() {
            let scope = {
                    name: 'ForensicJS'
                },
                result = Util.runSafe(function() {
                    return this.name;
                }, scope);
            expect(result).to.equals('ForensicJS');
        });

        it('should accept an optional parameter or array of parameters to pass in to executable during execution as a third argument', function() {
            let parameters = ['1.0.0', 'ForensicJS'],
                result = Util.runSafe(function(version, name) {
                    return {version, name};
                }, null, parameters);
            expect(result.version).to.equals('1.0.0');
        });

        it('should accept an optional wait before execution parameter in milliseconds as a fourth parameter', function() {
            let startTime = Date.now();

            return Util.runSafe(() => Date.now() - startTime, null, null, 1000)
                .then(result => expect(result).to.be.at.least(999));
        });

        it('should return a promise if given a wait parameter as fourth argument', function() {
            expect(Util.runSafe(function() {}, null, null, 1000)).to.be.a('promise');
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

    describe('.assign(target, ...objects)', function() {

        it(`should deeply assign all the comma separated list of object arguments to the given
            target object and return it`, function() {
            let obj1 = {
                name: 'test',
                countries: ['Nigeria', 'Ukraine', 'Gambia', 'Zambia', 'Jebba'],
                address: {
                    city: 'Obadiah'
                }
            };

            let obj2 = {
                age: 22,
                countries: ['Nigeria', 'Ghana'],
                address: {
                    state: 'Enugu',
                    lga: 'Udenu'
                }
            };
            expect(Util.assign({}, obj1, obj2, null)).to.deep.equal({
                name: 'test',
                age: 22,
                countries: ['Nigeria', 'Ghana', 'Gambia', 'Zambia', 'Jebba'],
                address: {
                    city: 'Obadiah',
                    state: 'Enugu',
                    lga: 'Udenu'
                }
            });

            expect(Util.assign(null, obj2, obj1)).to.deep.equals({
                name: 'test',
                age: 22,
                countries: ['Nigeria', 'Ukraine', 'Gambia', 'Zambia', 'Jebba'],
                address: {
                    city: 'Obadiah',
                    state: 'Enugu',
                    lga: 'Udenu'
                }
            });
        });
    });

    describe('.mkDirSync(dir)', function() {
        it(`should create the directory recursively if it does not exist`, function() {
            let dir = path.join(__dirname, '../../storage/media/images');
            Util.mkDirSync(dir);

            let result = fs.existsSync(dir);
            rimraf.sync(path.join(__dirname, '../../storage'));
            expect(result).to.be.true;
        });

        it(`should throw error if argument is not a string`, function() {
            expect(function() {
                Util.mkDirSync(null);
            }).to.throw(TypeError);
        });

        it(`should do nothing and return true if the directory exists`, function() {
            expect(Util.mkDirSync(path.resolve(__dirname))).to.be.true;
            expect(Util.mkDirSync('/')).to.be.true;
        });
    });
});