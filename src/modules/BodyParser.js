/**
 * Request body parser module
*/

export default class {

    /**
     *@param {string} tempDir - the absolute path to the temp directory
     *@param {string} encoding - the encoding used for files
    */
    constructor(tempDir, encoding) {
        this.tempDir = tempDir;
        this.encoding = encoding? encoding : 'latin1';
    }

    /**
     * return module identity
    */
    get [Symbol.toStringTag]() {
        return 'BodyParser';
    }

    /**
     * assigns value to the given target with the key name
     *@param {Object} target - the target object
     *@param {string} name - the field name
     *@param {string} value - the field value
    */
    assignValue(target, name, value) {
        //field names that end with [] take multiple values
        if (/\[\]$/.test(name)) {
            name = name.replace(/\[\]$/, '');
            if (typeof target[name] === 'undefined')
                target[name] = [value];
            else
                target[name].push(value);
        }
        else {
            target[name] = value;
        }
    }

    /**
     * parse json content
     *@param {string} string - the request body string
     *@returns {Object}
    */
    parseJSON(string) {
        let body = null;
        try {
            body = JSON.parse(string);
        }
        catch(ex) {
            body = {};
        }
        return body;
    }
}