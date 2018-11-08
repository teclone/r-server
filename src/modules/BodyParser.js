/**
 * Request body parser module
 *@module BodyParser
*/
import fs from 'fs';
import path from 'path';
import Util from './Util.js';

export default class {

    /**
     *@param {string} tempDir - the absolute path to the temp directory
     *@param {string} encoding - the encoding used for files
    */
    constructor(tempDir, encoding) {
        this.tempDir = tempDir;
        this.encoding = encoding? encoding : 'latin1';

        //create the temp dir if it is not created
        Util.mkDirSync(this.tempDir);
    }

    /**
     * return module identity
     *@private
     *@type {string}
    */
    get [Symbol.toStringTag]() {
        return 'BodyParser';
    }

    /**
     * clean up temp files
     *@private
     *@param {Object} files - the files object
    */
    cleanUpTempFiles(files) {

        const unlink = (path) => {
            if (fs.existsSync(path))
                fs.unlinkSync(path);
        };
        for (let [, file] of Object.entries(files)) {
            Util.makeArray(file.path).forEach(unlink);
        }

        return true;
    }

    /**
     * resolves the field name by removing trailing bracket
     *@param {string} fieldName - the field name
     *@return {Object}
    */
    resolveFieldName(fieldName) {
        if (/^(.+)\[\]$/.test(fieldName)) {
            return {name: RegExp.$1, isMultiValue: true};
        }
        return {name: fieldName, isMultiValue: false};
    }

    /**
     *@param {Object} body - the body object
     *@param {string} fieldName - the file field name
     *@param {string} value - the field value
    */
    assignBodyValue(body, fieldName, value) {
        const {name, isMultiValue} = this.resolveFieldName(fieldName);

        let target = value;
        if (isMultiValue) {
            target = body[name] || [];
            target.push(value);
        }

        body[name] = target;
    }

    /**
     *@param {Object} files - the files object
     *@param {string} fieldName - the file field name
     *@param {Object} value - the file value object
    */
    assignFileValue(files, fieldName, value) {
        const {name, isMultiValue} = this.resolveFieldName(fieldName);

        let target = value;
        if (isMultiValue) {
            target = files[name] || {path: [], size: [], type: [], name: [], tmpName: []};
            for(let [key, current] of Object.entries(value))
                target[key].push(current);
        }

        files[name] = target;
    }

    /**
     * processes and stores file
     *@private
     *@param {Object} parsedHeaders - the parsed headers
     *@param {string} parsedHeaders.fileName - the file name as captured from the form data
     *@param {string} parsedHeaders.type - file mime type as captured from the form data
     *@param {string} parsedHeaders.encoding - file content transfer encoding type
     *@param {string} content - the file content
     *@returns {Object}
    */
    processFile(parsedHeaders, content) {

        let tempFileName = Util.getRandomText(8) + '.tmp',
            filePath = path.join(this.tempDir, '/', tempFileName);

        fs.writeFileSync(filePath, content, parsedHeaders.encoding);

        return {
            name: decodeURIComponent(parsedHeaders.fileName).replace(/\.\./g, ''),
            tmpName: tempFileName,
            path: filePath,
            type: parsedHeaders.type.toLowerCase(),
            size: fs.statSync(filePath).size
        };
    }

    /**
     * parses a multipart part headers.
     *@private
     *@param {Array} headers - array of headers.
     *@returns {Object}
    */
    parsePartHeaders(headers) {
        //assume a default value if there are no headers sent
        if (headers.length === 0)
            return {isFile: false, type: 'text/plain', fileName: '',
                fieldName: Util.getRandomText(6), encoding: this.encoding};

        let result = {isFile: false, type: '', fileName: '', fieldName: '', encoding: this.encoding};
        for(let header of headers) {
            let [headerName, headerValue] = header.split(/\s*:\s*/);
            switch(headerName.toLowerCase()) {
                case 'content-disposition':
                    if (/filename="([^"]+)"/.exec(headerValue))
                        result.fileName = RegExp.$1;

                    headerValue = headerValue.replace(/filename="([^"]+)"/, '');

                    if (/name="([^"]+)"/.exec(headerValue))
                        result.fieldName = RegExp.$1;
                    else
                        result.fieldName = Util.getRandomText(6);
                    break;

                case 'content-type':
                    result.isFile = true;
                    result.type = headerValue.split(/;\s*/)[0];
                    break;

                case 'content-transfer-encoding':
                    result.encoding = headerValue;
                    break;
            }
        }
        return result;
    }

    /**
     * parse multipart form data
     *@private
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

            let headers = [],
                content = '';

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

            //parse through the headers
            let parsedHeaders = this.parsePartHeaders(headers);
            if (parsedHeaders.isFile) {
                this.assignFileValue(files, parsedHeaders.fieldName, this.processFile(parsedHeaders, content));
            }
            else {
                this.assignBodyValue(body, parsedHeaders.fieldName, content);
            }
        }
        return {body, files};
    }

    /**
     * parse json content
     *@private
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
     *@private
     *@param {string} string - the request body string
     *@returns {Object}
    */
    parseUrlEncoded(string) {
        let body = {};
        if (string) {
            let pairs = string.split('&');
            for (let pair of pairs) {
                let [name, value] = pair.split('=');
                this.assignBodyValue(body, decodeURIComponent(name), decodeURIComponent(value));
            }
        }
        return body;
    }

    /**
     * parse the query parameters in the url given
     *@private
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
     *@param {Buffer} buffer - the buffer data
     *@param {string} contentType - the request content type
    */
    parse(buffer, contentType) {
        let content = buffer.toString(this.encoding),
            tokens = contentType.split(/;\s*/),
            boundary = '';

        switch(tokens[0].toLowerCase()) {

            case 'text/plain':
            case 'application/x-www-form-urlencoded':
                return {files: {}, body: this.parseUrlEncoded(content)};

            case 'text/json':
            case 'application/json':
                return {files: {}, body: this.parseJSON(content)};

            case 'multipart/form-data':
                if (tokens.length === 2 && /boundary\s*=\s*/.test(tokens[1]))
                    boundary = tokens[1].split('=')[1];
                return this.parseMultiPart(content, boundary);

            default:
                return {body: {}, files: {}};
        }
    }
}