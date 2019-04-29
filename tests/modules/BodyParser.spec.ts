import BodyParser from '../../src/modules/BodyParser';
import { entryPath, multipartLogFile, multipartBoundary, multipartLogFileNoBoundary } from '../helpers';
import rServerConfig from '../../src/.server';
import { encodeQueries } from '@forensic-js/utils';
import * as fs from 'fs';

describe('BodyParser', function() {

    let bodyParser: BodyParser = null;
    const data = {
        username: 'harrison',
        password1: 'random_243',
        password2: 'random_243',
        languages: ['Java', 'PHP', 'JavaScript', 'Ruby', 'Python']
    };

    const buffer = Buffer.from(encodeQueries(data));

    beforeEach(function() {
        bodyParser = new BodyParser(entryPath, rServerConfig);
    });

    describe(`#constructor(entryPath: string, config: RServerConfig)`, function() {
        it(`should create a body parser instance`, function() {
            expect(bodyParser).toBeInstanceOf(BodyParser);
        });
    });

    describe(`#parseQueryString(url: string)`, function() {
        it(`should extract and parse the query portion of the given url`, function() {
            const url = '/index?' + encodeQueries(data);
            expect(bodyParser.parseQueryString(url)).toEqual(data);
        });

        it(`should default query parameters with no value to empty string`, function() {
            expect(bodyParser.parseQueryString('/index?name')).toEqual({name: ''});
        });

        it(`should return empty object if url has no query portion`, function() {
            expect(bodyParser.parseQueryString('/index')).toEqual({});
            expect(bodyParser.parseQueryString('/index?')).toEqual({});
        });
    });

    describe(`#parse(buffer: Buffer, contentType: string): {files: Files, body: Data}`, function() {

        it(`should inspect the given contentType, and parse the buffer data accordingly, passing
            data as urlencoded into body if contentType is text/plain or application/x-www-form-urlencoded`, function() {
            expect(bodyParser.parse(buffer, 'text/plain').body).toEqual(data);
            expect(bodyParser.parse(buffer, 'application/x-www-form-urlencoded').body).toEqual(data);
        });

        it(`should inspect the given contentType, and parse the buffer data accordingly, passing
            data as json encode into body if contentType is text/json or application/json`, function() {
            const buffer = Buffer.from(JSON.stringify(data));
            expect(bodyParser.parse(buffer, 'text/json').body).toEqual(data);
            expect(bodyParser.parse(buffer, 'application/json').body).toEqual(data);
        });

        it(`should catch json decode error for erronous json strings and return empty object`, function() {
            const erronousJson = '{\'age\': 20}';
            const buffer = Buffer.from(erronousJson);
            expect(bodyParser.parse(buffer, 'text/json').body).toEqual({});
        });

        it(`should inspect the given contentType, and parse the buffer data accordingly, passing
            data as multipart form data into body and files object if contentType is
            multipart/form-data`, function() {

            const buffer = fs.readFileSync(multipartLogFile);
            const contentType = `multipart/form-data; boundary=${multipartBoundary}`;

            const result = bodyParser.parse(buffer, contentType);
            expect(result.body).toEqual(data);
            bodyParser.cleanUpTempFiles(result.files);
        });

        it(`should detect the multipart boundary if not given`, function() {

            const buffer = fs.readFileSync(multipartLogFile);
            const contentType = `multipart/form-data`;

            const result = bodyParser.parse(buffer, contentType);
            expect(result.body).toEqual(data);
            bodyParser.cleanUpTempFiles(result.files);
        });

        it(`should return empty body and files object if multipart boundary is not given and it
        could not be detected`, function() {

            const buffer = fs.readFileSync(multipartLogFileNoBoundary);
            const contentType = `multipart/form-data`;

            const result = bodyParser.parse(buffer, contentType);
            expect(result.body).toEqual({});
            expect(result.files).toEqual({});
        });

        it(`should do nothing if contentType is not recognised and return empty body and files
        object`, function() {

            const buffer = Buffer.from(JSON.stringify(data));
            expect(bodyParser.parse(buffer, '').body).toEqual({});
            expect(bodyParser.parse(buffer, '').files).toEqual({});
        });
    });

    describe(`#cleanUpTempFiles(files: Files)`, function() {

        it(`should delete the given temporary files when request-response lifecycle completes`, function() {
            const buffer = fs.readFileSync(multipartLogFile);
            const contentType = `multipart/form-data; boundary=${multipartBoundary}`;

            const result = bodyParser.parse(buffer, contentType);
            const files = result.files;

            expect(fs.existsSync(files['file-cv'].path as string)).toBeTruthy();
            bodyParser.cleanUpTempFiles(result.files);
            expect(fs.existsSync(files['file-cv'].path as string)).toBeFalsy();
        });

        it(`should skip unexisting files at the time of call and do nothing`, function() {
            const buffer = fs.readFileSync(multipartLogFile);
            const contentType = `multipart/form-data; boundary=${multipartBoundary}`;

            const result = bodyParser.parse(buffer, contentType);
            const files = result.files;
            fs.unlinkSync(files['file-cv'].path as string);

            expect(fs.existsSync(files['file-cv'].path as string)).toBeFalsy();
            expect(function() {
                bodyParser.cleanUpTempFiles(result.files);
            }).not.toThrow();
        });
    });
});