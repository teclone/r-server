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
}