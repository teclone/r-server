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

    /**
     * parse url encoded request body
     *@param {string} string - the request body string
     *@returns {Object}
    */
    parseUrlEncoded(string) {
        let body = {};
        if (string) {
            let pairs = string.split('&');
            for (let pair of pairs) {
                let [name, value] = pair.split('=');
                this.assignValue(body, decodeURIComponent(name), decodeURIComponent(value));
            }
        }
        return body;
    }

    /**
     * parse the query parameters in the url given
     *@param {string} url - the request url
     *@return {Object}
    */
    parseQueryString(url) {
        if (url.indexOf('?') > -1)
            return this.parseUrlEncoded(url.split('?')[1]);
        else
            return {};
    }

    /**
     * parse multipart form data
     *@param {string} string - the request body string
     *@param {string} [boundary] - the multipart boundary token
     *@returns {Object}
     *@see https://www.w3.org/Protocols/rfc1341/7_2_Multipart.html
    */
    parseMultiPart(string, boundary) {
        let body = {}, files = {};

        /* istanbul ignore else */
        if (boundary)
            boundary = '--' + boundary;
        else if (/(-{2,}[a-z0-9]+)\r\n/i.exec(string))
            boundary = RegExp.$1;
        else
            return {body, files};

        //obtain the body parts, discard multipart preamble and epilogue
        let parts = string.split(boundary).slice(1, -1);

        for (let part of parts) {
            //remove the first and last CRLF
            part = part.replace(/^\r\n/, '').replace(/\r\n$/, '');

            let headers = [], content = '';

            //if there are no headers, assume default values according to the spec
            /* istanbul ignore if */
            if (/^\r\n/.test(part)) {
                content = part.replace(/^\r\n/, '');
            }
            else {
                let lines = part.split(/\r\n/);

                //a blank line separates the part headers from the part content
                let separatorLineIndex = lines.indexOf('');

                //slice out the headers and the content
                headers = lines.slice(0, separatorLineIndex);
                content = lines.slice(separatorLineIndex + 1).join('\r\n');
            }
        }
        return {body, files};
    }
}