/**
 * Utility module
 * this module defines a bunch of utility functions that will be relevant to most other modules
*/
let toString = Object.prototype.toString;

export default {
    /**
     * tests if a variable is a number
     *@param {*} variable - variable to test
     *@returns {boolean}
    */
    isNumber(variable) {
        return typeof variable === 'number' && !isNaN(variable) && isFinite(variable);
    },

    /**
     * tests if a variable is a function
     *@param {*} variable - variable to test
     *@returns {boolean}
    */
    isCallable(variable) {
        return (toString.call(variable) === '[object Function]' || variable instanceof Function) && !(variable instanceof RegExp);
    },

    /**
     * tests if a variable is an array
     *@param {*} variable - variable to test
     *@returns {boolean}
    */
    isArray(variable) {
        return toString.call(variable) === '[object Array]' || variable instanceof Array;
    },

    /**
     * tests if a variable is an object
     *@param {*} variable - variable to test
     *@returns {boolean}
    */
    isObject(variable) {
        return typeof variable === 'object' && variable !== null;
    },

    /**
     * tests if a variable is a plain object literal
     *@param {*} variable - variable to test
     *@returns {boolean}
    */
    isPlainObject(variable) {
        if (this.isObject(variable)) {
            let prototypeOf = Object.getPrototypeOf(variable);
            return prototypeOf === null || prototypeOf === Object.getPrototypeOf({});
        }
        return false;
    },

    /**
     * tests if a variable is a valid function parameter
     *@param {*} variable - variable to test
     *@param {boolean} excludeNulls - boolean value indicating if null values should be
     * taken as an invalid parameter
     *@returns {boolean}
    */
    isValidParameter(variable, excludeNulls) {
        if (excludeNulls && variable === null)
            return false;
        return typeof variable !== 'undefined';
    },

    /**
     * returns the argument if it is already an array, or makes an array using the argument
     *@param {*} arg - the argument
     *@param {boolean} excludeNulls - boolean value indicating if null argument should default
     * to empty array just like undefined argument
     *@returns {Array}
    */
    makeArray: function(arg, excludeNulls) {
        if (this.isArray(arg))
            return arg;
        return this.isValidParameter(arg, excludeNulls)? [arg] : [];
    },

    /**
     * generates a callback function, scoping the execution with optional extra parameters
     *@param {Function} callback - the callback function
     *@param {Scope} [scope] - the execution scope - defaults to the host object
     *@param {Array} [parameters=null] - array of parameters to pass in to callback during execution
     *@throws {TypeError} throws error if callback is not a function
     *@returns {Function}
    */
    generateCallback(callback, scope, parameters) {
        if (!this.isCallable(callback)) {
            throw new TypeError('argument one is not a function');
        }
        scope = this.isObject(scope) ? scope : this;
        parameters = this.makeArray(parameters);

        return (...args) => {
            let mergedParameters = [...args, ...parameters];
            try {
                return callback.apply(scope, mergedParameters);
            }
            catch (ex) {
                //
            }
        };
    },

    /**
     * runs the executable and supresses all runtime errors
     *@param {Function} executable - function to execute
     *@param {Scope} [scope] - runtime scope object - defaults to the host object
     *@param {Array} [parameters=null] - array of parameters to pass in to executable
     *@param {number} [runAfter=0] - least number of time in milliseconds to wait before
     * starting the execution
     *@throws {TypeError} if argument one is not a function
     *@returns {mixed} this will return a promise if runAfter parameter is given else it will
     * return the execution control
    */
    runSafe(executable, scope, parameters, runAfter) {
        let callback = this.generateCallback(executable, scope, parameters);
        if (runAfter) {
            return new Promise(function(resolve) {
                setTimeout(() => {
                    resolve(callback()); // pass in the return value to the resolve method
                }, runAfter);
            });
        }
        return callback();
    },

    /**
     * converts the letters into camel like cases
     *@param {string} value - the string word to convert
     *@param {string|RegExp} [delimiter=/[-_]/] - a delimiter string or regex pattern used in
     * finding split segments
     *@returns {string}
    */
    camelCase(value, delimiter = /[-_]/) {
        value = value.toString();
        let tokens = value.split(delimiter).map((token, idx) => {
            return idx === 0? token : token[0].toUpperCase() + token.substring(1);
        });
        return tokens.join('');
    },

    /**
     * generates a radom text with given length of characters
     *@param {number} [length=4] - char length of the random text to generate
     *@returns {string}
    */
    getRandomText(length) {
        let chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
        rands = [], i = -1;

        length = length? length : 4;
        while (++i < length)
            rands.push(chars.charAt(Math.floor(Math.random() * chars.length)));

        return rands.join('');
    },

    /**
     * performs a deep merge of all comma seperated list of objects and returns a new object
     *@param {...Object} objects - comma separated list of objects to merge
     *@returns {Object}
    */
    mergeObjects(...objects) {
        /**
         * runs the process
         *@param {Object} dest - the destination object
         *@param {Object} src - the src object
         *@returns {Object}
        */
        function run(dest, src) {
            let keys = Object.keys(src);
            for (let key of keys) {
                let value = src[key];

                if (typeof dest[key] === 'undefined')
                    dest[key] = this.isPlainObject(value)?
                        run.call(this, {}, value) : value;

                else if (this.isPlainObject(value) && !this.isPlainObject(dest[key]))
                    continue;

                else
                    dest[key] = this.isPlainObject(value)?
                        run.call(this, dest[key], value) : value;
            }
            return dest;
        }

        let dest = {};
        for (let object of objects) {
            if (!this.isPlainObject(object))
                continue;
            dest = run.call(this, dest, object);
        }
        return dest;
    }
};