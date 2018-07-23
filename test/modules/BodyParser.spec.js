import BodyParser from '../../src/modules/BodyParser.js';
import path from 'path';
import fs from 'fs';

describe('BodyParser', function() {
    let bodyParser = null;

    before(function() {
        bodyParser = new BodyParser(path.resolve(__dirname, '../../storage/temp'), 'latin1');
    });

    describe(`#constructor(tempDir)`, function() {
        it(`should create a bodyParser given the temporary file directory path`, function() {
            expect(bodyParser).to.be.a('BodyParser');
        });
    });

    describe('#assignValue(target, name, value)', function() {
        it(`should assign the given name key and value pair to the target object`, function() {
            let target = {};
            bodyParser.assignValue(target, 'first-name', 'Harrison');
            expect(target).to.have.own.property('first-name').that.equals('Harrison');
        });

        it(`should create array entries for names that ends with [], the final name key should
            not have the ending [] in it`, function() {
            let target = {};
            bodyParser.assignValue(target, 'choices[]', 'Cake');
            bodyParser.assignValue(target, 'choices[]', 'Coffee');
            expect(target).to.have.own.property('choices').that.deep.equals(['Cake', 'Coffee']);
        });
    });

    describe('#cleanUpTempFiles(files)', function() {
        it(`should delete all temporarily files from the temp folder once the
            response finishes`, function() {
            let dir = path.resolve(__dirname, '../../'),
                filePath = path.join(dir + '/' + 'file1.txt');

            fs.writeFileSync(filePath, 'my name is harrison');
            expect(fs.existsSync(filePath)).to.be.true;

            new BodyParser('/').cleanUpTempFiles({
                'file1': {path: filePath}
            });

            expect(fs.existsSync(filePath)).to.be.false;

        });

        it(`should iterate through an array of multi files and delete all files`, function() {
            let dir = path.resolve(__dirname, '../../'),
                filePath1 = path.join(dir + '/' + 'file1.txt'),
                filePath2 = path.join(dir + '/' + 'file2.txt');

            fs.writeFileSync(filePath1, 'my name is harrison');
            fs.writeFileSync(filePath2, 'my name is harrison');

            expect(fs.existsSync(filePath1)).to.be.true;
            expect(fs.existsSync(filePath2)).to.be.true;

            new BodyParser('/').cleanUpTempFiles({
                'people-files': [{path: filePath1}, {path: filePath2}]
            });

            expect(fs.existsSync(filePath1)).to.be.false;
            expect(fs.existsSync(filePath2)).to.be.false;

        });
    });

    describe('#processFile(parsedHeaders, content)', function() {
        it(`should create a temporary file in the temp directory writing the content into the
        file`, function() {
            let bodyParser = new BodyParser(path.resolve(__dirname, '../../storage/temp')),
                parsedHeaders = {fileName: 'my-file.txt', mimeType: 'text/plain'};

            let tempFileDetails = bodyParser.processFile(parsedHeaders, 'my name is harrison');

            expect(fs.existsSync(tempFileDetails.path)).to.be.true;
            expect(fs.readFileSync(tempFileDetails.path, 'latin1'))
                .to.equals('my name is harrison');

            bodyParser.cleanUpTempFiles({'file-cv':tempFileDetails});
        });
    });

    describe('#processPartHeaders(headers)', function() {
        it(`should parse the array of multipart part headers, dectecting stuffs such as part header
        field name, filename, content type and transfer encoding.`, function() {
            let bodyParser = new BodyParser(path.resolve(__dirname, '../../storage/temp'));

            //taken from a live chrome network console
            let headers = [
                    'Content-Disposition: form-data; name="username"'
                ],
                result = bodyParser.parsePartHeaders(headers);

            expect(result).to.deep.equals({
                fileName: '',
                mimeType: '',
                fieldName: 'username',
                isFile: false,
                encoding: 'latin1'
            });
        });

        it(`should be able to detect if part headers are for a file upload judging by the
            presence of the Content-Type header`, function() {
            let bodyParser = new BodyParser(path.resolve(__dirname, '../../storage/temp'));

            //taken from a live chrome network console
            let headers = [
                    'Content-Disposition: form-data; name="file-music"; filename="Tiwa_Savage_Sugar_Cane_9jaflaver.com_.mp3"',
                    'Content-Type: audio/mp3'
                ],
                result = bodyParser.parsePartHeaders(headers);

            expect(result).to.deep.equals({
                fileName: 'Tiwa_Savage_Sugar_Cane_9jaflaver.com_.mp3',
                mimeType: 'audio/mp3',
                fieldName: 'file-music',
                isFile: true,
                encoding: 'latin1'
            });
        });

        it(`should generate a random field name if there is no name entry in the
            Content-Disposition header`, function() {
            let bodyParser = new BodyParser(path.resolve(__dirname, '../../storage/temp'));

            //taken from a live chrome network console
            let headers = [
                    'Content-Disposition: form-data; filename="Tiwa_Savage_Sugar_Cane_9jaflaver.com_.mp3"',
                    'Content-Type: audio/mp3'
                ],
                result = bodyParser.parsePartHeaders(headers);

            expect(result.fieldName).to.be.a('string').and.not.equals('');
        });

        it(`should return a default parse with a random field name if header array is empty`, function() {
            let bodyParser = new BodyParser(path.resolve(__dirname, '../../storage/temp'));

            let result = bodyParser.parsePartHeaders([]);

            expect(result).to.deep.equals({
                fileName: '',
                mimeType: 'text/plain',
                fieldName: result.fieldName,
                isFile: false,
                encoding: 'latin1'
            });
        });

        it(`should detect the content transfer encoding if given. default transfer encoding used is
            latin1`, function() {
            let bodyParser = new BodyParser(path.resolve(__dirname, '../../storage/temp'));

            //taken from a live chrome network console, added the content-transfer-encoding
            let headers = [
                'Content-Disposition: form-data; filename="Tiwa_Savage_Sugar_Cane_9jaflaver.com_.mp3"',
                'Content-Type: audio/mp3',
                'Content-Transfer-Encoding: binary'
            ];

            let result = bodyParser.parsePartHeaders(headers);

            expect(result.encoding).to.equals('binary');
        });
    });

    describe('#parseMultiPart(string, boundary)', function() {
        it(`should parse the mutlipart string and return an object consisting of a body and
        file objects entries, where the body entry contains form fields and values while the
        file entry is specifically for file fields`, function() {
            let filePath = path.resolve(__dirname, '../helpers/multipart.log'),

                boundary = '----WebKitFormBoundaryAw0u9Lykfr41KdqS';

            let result = bodyParser.parseMultiPart(fs.readFileSync(filePath, 'latin1'), boundary);

            expect(result.body).deep.equals({
                username: 'harrison',
                password1: 'random_243',
                password2: 'random_243',
                languages: ['Java', 'PHP', 'JavaScript', 'Ruby']
            });
        });

        it(`should detect the part boundary if not given`, function() {
            let filePath = path.resolve(__dirname, '../helpers/multipart.log');

            let bodyParser = new BodyParser(path.resolve(__dirname, '../../storage/temp'));

            let result = bodyParser.parseMultiPart(fs.readFileSync(filePath, 'latin1'));

            expect(result.body).deep.equals({
                username: 'harrison',
                password1: 'random_243',
                password2: 'random_243',
                languages: ['Java', 'PHP', 'JavaScript', 'Ruby']
            });
        });
    });

    describe('#parseUrlEncoded(string)', function() {
        it(`should parse the url encoded string and return the result. creating array entries
            for names that ends with []. the final name key should have the [] stripped from it`, function() {

            //create name value tuples
            let data = [
                ['name', 'Harrison Ifeanyichukwu'],
                ['email', 'harrisonifeanyichukwu@gmail.com'],
                ['username', '_vespar'],
                ['languages[]', 'javaScript'],
                ['languages[]', 'node.js'],
                ['languages[]', 'php'],
                ['languages[]', 'ruby']
            ];

            let encodedString = data.map(([name, value]) => {
                return encodeURIComponent(name) + '=' + encodeURIComponent(value);
            }).join('&');

            let parsedData = bodyParser.parseUrlEncoded(encodedString);
            expect(parsedData).to.deep.equals({
                name: 'Harrison Ifeanyichukwu',
                email: 'harrisonifeanyichukwu@gmail.com',
                username: '_vespar',
                languages: ['javaScript', 'node.js', 'php', 'ruby']
            });
        });

        it(`should do nothing if passed an empty string, returning an empty object`, function() {

            let parsedData = bodyParser.parseUrlEncoded('');
            expect(parsedData).to.deep.equals({});
        });
    });

    describe('#parseJSON(string)', function() {
        it(`should decode the json string given, and return the result`, function() {
            let myJson = [
                ['name', 'Harrison Ifeanyichukwu'],
                ['email', 'harrisonifeanyichukwu@gmail.com'],
                ['username', '_vespar'],
                ['languages[]', 'javaScript'],
                ['languages[]', 'node.js'],
                ['languages[]', 'php'],
                ['languages[]', 'ruby']
            ];

            let parsedJSON = bodyParser.parseJSON(JSON.stringify(myJson));
            expect(myJson).to.deep.equals(parsedJSON);
        });

        it(`should catch all errors if the passed in string is not a valid json and return
            and empty object`, function() {

            let parsedJSON = bodyParser.parseJSON('{name: \'harry\'}');
            expect(parsedJSON).to.deep.equals({});
        });
    });

    describe('parse(buffer, contentType)', function() {
        it(`should run a parse type on the given buffer depending on the contentType
            argument, returning an object containing files and body objects.
            should run json parse if content type is either text/json or application/json.`, function(){
            let myJson = [
                    ['name', 'Harrison Ifeanyichukwu'],
                    ['email', 'harrisonifeanyichukwu@gmail.com'],
                    ['username', '_vespar'],
                    ['languages[]', 'javaScript'],
                    ['languages[]', 'node.js'],
                    ['languages[]', 'php'],
                    ['languages[]', 'ruby']
                ],
                buffer = Buffer.from(JSON.stringify(myJson));

            let result = bodyParser.parse(buffer, 'application/json');
            expect(result.body).to.deep.equals(myJson);
        });

        it(`should run url encoded parse if content type is either application/x-www-form-urlencoded
        or text/plain`, function(){
            //create name value tuples
            let data = [
                ['name', 'Harrison Ifeanyichukwu'],
                ['email', 'harrisonifeanyichukwu@gmail.com'],
                ['username', '_vespar'],
                ['languages[]', 'javaScript'],
                ['languages[]', 'node.js'],
                ['languages[]', 'php'],
                ['languages[]', 'ruby']
            ];

            let encodedString = data.map(([name, value]) => {
                    return encodeURIComponent(name) + '=' + encodeURIComponent(value);
                }).join('&'),

                buffer = Buffer.from(encodedString);

            let parsedData = bodyParser.parse(buffer, 'application/x-www-form-urlencoded');
            expect(parsedData.body).to.deep.equals({
                name: 'Harrison Ifeanyichukwu',
                email: 'harrisonifeanyichukwu@gmail.com',
                username: '_vespar',
                languages: ['javaScript', 'node.js', 'php', 'ruby']
            });
        });

        it(`should run mulipart parse if content type is multipart/form-data`, function(){
            let filePath = path.resolve(__dirname, '../helpers/multipart.log'),

                boundary = '----WebKitFormBoundaryAw0u9Lykfr41KdqS';

            let result = bodyParser.parse(
                Buffer.from(fs.readFileSync(filePath, 'latin1'), 'latin1'),
                'multipart/form-data; boundary=' + boundary
            );

            expect(result.body).deep.equals({
                username: 'harrison',
                password1: 'random_243',
                password2: 'random_243',
                languages: ['Java', 'PHP', 'JavaScript', 'Ruby']
            });
        });

        it(`should run mulipart parse if content type is multipart/form-data even when
        the boundary token is not specified`, function(){
            let filePath = path.resolve(__dirname, '../helpers/multipart.log');

            let result = bodyParser.parse(
                Buffer.from(fs.readFileSync(filePath, 'latin1'), 'latin1'),
                'multipart/form-data'
            );

            expect(result.body).deep.equals({
                username: 'harrison',
                password1: 'random_243',
                password2: 'random_243',
                languages: ['Java', 'PHP', 'JavaScript', 'Ruby']
            });
        });

        it(`should run no parse if the content type does not match any of the above and return
        object containing empty files and body objects`, function(){
            let filePath = path.resolve(__dirname, '../helpers/multipart.log');

            let result = bodyParser.parse(
                Buffer.from(fs.readFileSync(filePath, 'latin1'), 'latin1'),
                ''
            );

            expect(result).deep.equals({
                body: {},
                files: {}
            });
        });
    });

    describe('#parseQueryString(url)', function() {
        it(`should parse all query string present in the url and return the result`, function() {
            //create name value tuples
            let data = [
                ['name', 'Harrison Ifeanyichukwu'],
                ['email', 'harrisonifeanyichukwu@gmail.com'],
                ['username', '_vespar'],
                ['languages[]', 'javaScript'],
                ['languages[]', 'node.js'],
                ['languages[]', 'php'],
                ['languages[]', 'ruby']
            ];

            let encodedString = data.map(([name, value]) => {
                return encodeURIComponent(name) + '=' + encodeURIComponent(value);
            }).join('&');

            let parsedQuery = bodyParser.parseQueryString('my-url/something?' + encodedString);

            expect(parsedQuery).to.deep.equals({
                name: 'Harrison Ifeanyichukwu',
                email: 'harrisonifeanyichukwu@gmail.com',
                username: '_vespar',
                languages: ['javaScript', 'node.js', 'php', 'ruby']
            });
        });

        it(`should do nothing if the url has no query string`, function() {

            let parsedQuery = bodyParser.parseQueryString('my-url/something?');
            expect(parsedQuery).to.deep.equals({});

            parsedQuery = bodyParser.parseQueryString('my-url/something');
            expect(parsedQuery).to.deep.equals({});
        });
    });
});