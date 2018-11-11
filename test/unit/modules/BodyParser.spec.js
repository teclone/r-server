import BodyParser from '../../../src/modules/BodyParser.js';
import path from 'path';
import fs from 'fs';
import sinon from 'sinon';

describe('BodyParser', function() {
    let bodyParser = null;

    before(function() {
        bodyParser = new BodyParser(path.resolve(__dirname, '../../../storage/temp'), 'latin1');
    });

    describe(`#constructor(tempDir, encoding?)`, function() {
        it(`should create a bodyParser given the temporary file directory path and default encoding`, function() {
            expect(bodyParser).to.be.a('BodyParser');
        });

        it(`should can create a body parser without the encoding argument`, function() {
            expect(new BodyParser(path.resolve(__dirname, '../../../storage/temp')))
                .to.be.a('BodyParser');
        });
    });

    describe('#assignBodyValue(body, name, value)', function() {
        it(`should assign the given name key and value pair to the target body object`, function() {
            let body = {};
            bodyParser.assignBodyValue(body, 'first-name', 'Harrison');
            expect(body).to.have.own.property('first-name').that.equals('Harrison');
        });

        it(`should create array entries for names that ends with [], the final name key should
            not have the ending [] in it`, function() {
            let body = {};
            bodyParser.assignBodyValue(body, 'choices[]', 'Cake');
            bodyParser.assignBodyValue(body, 'choices[]', 'Coffee');
            expect(body).to.have.own.property('choices').that.deep.equals(['Cake', 'Coffee']);
        });
    });

    describe('#assignFileValue(files, name, value)', function() {
        it(`should assign the given name key and value pair to the target files object`, function() {
            let files = {},
                value = {path: '', size: 10, name: 'file1.jpg', tmpName: 'something.tmp', type: 'image/jpeg'};

            bodyParser.assignFileValue(files, 'file', value);
            expect(files).to.deep.equals({file: value});
        });

        it(`should create array keys for every file parameter and push each corresponding file
            parameter to its own array for file fields ending with []. it discards the ending
                brace while storing the file`, function() {
            let files = {},
                value = {path: '', size: 10, name: 'file1.jpg', tmpName: 'something.tmp', type: 'image/jpeg'};

            bodyParser.assignFileValue(files, 'files[]', value);
            bodyParser.assignFileValue(files, 'files[]', value);

            expect(files).to.deep.equals({
                files: {
                    path: ['', ''],
                    size: [10, 10],
                    name: ['file1.jpg', 'file1.jpg'],
                    tmpName: ['something.tmp', 'something.tmp'],
                    type: ['image/jpeg', 'image/jpeg']
                }
            });
        });
    });

    describe('#cleanUpTempFiles(files)', function() {
        it(`should delete all temporarily files from the temp folder once the
            response finishes. taking care to check if the file still exists`, function() {
            let dir = path.resolve(__dirname, '../../../'),
                filePath = path.join(dir + '/' + 'file1.txt');

            fs.writeFileSync(filePath, 'my name is harrison');
            expect(fs.existsSync(filePath)).to.be.true;

            bodyParser.cleanUpTempFiles({
                'file1': {
                    path: filePath
                }
            });

            expect(fs.existsSync(filePath)).to.be.false;

        });

        it(`should iterate through an array of multi files and delete all files`, function() {
            let dir = path.resolve(__dirname, '../../../'),
                paths = [
                    path.join(dir + '/' + 'file1.txt'),
                    path.join(dir + '/' + 'file2.txt')
                ];

            paths.forEach(current => {
                fs.writeFileSync(current, 'my name is harrison');
                expect(fs.existsSync(current)).to.be.true;
            });

            //push a file that does not exist
            paths.push('something/file.jpg');

            bodyParser.cleanUpTempFiles({
                'files': {
                    path: paths
                }
            });

            paths.forEach(current => {
                expect(fs.existsSync(current)).to.be.false;
            });

        });
    });

    describe('#processFile(parsedHeaders, content)', function() {
        it(`should create a temporary file in the temp directory writing the content into the
            file`, function() {
            const parsedHeaders = {fileName: 'my-file.txt', type: 'text/plain'},
                tempFileDetails = bodyParser.processFile(parsedHeaders, 'my name is harrison');

            expect(fs.existsSync(tempFileDetails.path)).to.be.true;
            expect(fs.readFileSync(tempFileDetails.path, 'latin1')).to.equals('my name is harrison');

            bodyParser.cleanUpTempFiles({'file-cv': tempFileDetails});
        });

        it(`should not create any temporary file in the temp directory if the fileName header is
            empty`, function() {
            const parsedHeaders = {fileName: '', type: ''},
                tempFileDetails = bodyParser.processFile(parsedHeaders, 'my name is harrison');

            expect(tempFileDetails).to.deep.equals({
                path: '', name: '', tmpName: '', type: '', size: 0
            });
        });
    });

    describe('#processPartHeaders(headers)', function() {
        it(`should parse the array of multipart part headers, dectecting headers such as
        field name, filename, content type, and transfer encoding.`, function() {
            //taken from a live chrome network console
            const headers = [
                    'Content-Disposition: form-data; name="username"'
                ],
                result = bodyParser.parsePartHeaders(headers);

            expect(result).to.deep.equals({
                fileName: '',
                type: '',
                fieldName: 'username',
                isFile: false,
                encoding: 'latin1'
            });
        });

        it(`should detect if part headers are for a file upload judging by the
            presence of the Content-Type header`, function() {
            //taken from a live chrome network console
            const headers = [
                    'Content-Disposition: form-data; name="file-music"; filename="Tiwa_Savage_Sugar_Cane_9jaflaver.com_.mp3"',
                    'Content-Type: audio/mp3'
                ],
                result = bodyParser.parsePartHeaders(headers);

            expect(result).to.deep.equals({
                fileName: 'Tiwa_Savage_Sugar_Cane_9jaflaver.com_.mp3',
                type: 'audio/mp3',
                fieldName: 'file-music',
                isFile: true,
                encoding: 'latin1'
            });
        });

        it(`should generate a random field name if there is no name entry in the
            Content-Disposition header`, function() {
            //taken from a live chrome network console
            const headers = [
                    'Content-Disposition: form-data; filename="Tiwa_Savage_Sugar_Cane_9jaflaver.com_.mp3"',
                    'Content-Type: audio/mp3'
                ],
                result = bodyParser.parsePartHeaders(headers);

            expect(result.fieldName).to.be.a('string').and.not.equals('');
        });

        it(`should return a default parse with a random field name if header array is empty`, function() {
            const result = bodyParser.parsePartHeaders([]);

            expect(result).to.deep.equals({
                fileName: '',
                type: 'text/plain',
                fieldName: result.fieldName,
                isFile: false,
                encoding: 'latin1'
            });
        });

        it(`should detect the content transfer encoding if given. default transfer encoding used is
            latin1`, function() {
            //taken from a live chrome network console, added the content-transfer-encoding
            const headers = [
                    'Content-Disposition: form-data; filename="Tiwa_Savage_Sugar_Cane_9jaflaver.com_.mp3"',
                    'Content-Type: audio/mp3',
                    'Content-Transfer-Encoding: binary'
                ],
                result = bodyParser.parsePartHeaders(headers);

            expect(result.encoding).to.equals('binary');
        });
    });

    describe('Parse methods', function() {
        let data = null;

        //converts the data to a url encoded string
        const dataToString = function() {
            return Object.keys(data).reduce((result, key) => {

                const value = data[key];

                if (value instanceof Array)
                    result.push(value.map(current => key + '[]=' + current).join('&'));
                else
                    result.push(key + '=' + value);

                return result;

            }, []).join('&');
        };

        const dataToBuffer = function() {
            return Buffer.from(dataToString());
        };

        beforeEach(function() {
            data = {
                username: 'harrison',
                password1: 'random_243',
                password2: 'random_243',
                languages: ['Java', 'PHP', 'JavaScript', 'Ruby']
            };
        });

        describe('#parseQueryString(url)', function() {
            it(`should parse all query string present in the url and return the result`, function() {

                let parsedQuery = bodyParser.parseQueryString('my-url/something?' + dataToString());

                expect(parsedQuery).to.deep.equals(data);
            });

            it(`should do nothing if the url has no query string`, function() {

                let parsedQuery = bodyParser.parseQueryString('my-url/something?');
                expect(parsedQuery).to.deep.equals({});

                parsedQuery = bodyParser.parseQueryString('my-url/something');
                expect(parsedQuery).to.deep.equals({});
            });
        });

        describe('#parseMultiPart(string, boundary)', function() {
            it(`should parse the multipart string and return an object consisting of body and
            file objects keys`, function() {
                const filePath = path.resolve(__dirname, '../../helpers/multipart.log'),
                    boundary = '----WebKitFormBoundaryAw0u9Lykfr41KdqS';

                expect(bodyParser.parseMultiPart(fs.readFileSync(filePath, 'latin1'), boundary).body)
                    .deep.equals(data);
            });

            it(`should detect the part boundary if not given`, function() {
                const filePath = path.resolve(__dirname, '../../helpers/multipart.log');

                expect(bodyParser.parseMultiPart(fs.readFileSync(filePath, 'latin1')).body)
                    .deep.equals(data);
            });
        });

        describe('#parseUrlEncoded(string)', function() {
            it(`should parse the url encoded string and return the result, turning fields that
            with [] to arrays, while striping out the brackets entirely`, function() {
                const parsedData = bodyParser.parseUrlEncoded(dataToString());
                expect(parsedData).to.deep.equals(data);

            });

            it(`should do nothing if argument is an empty string, returning an empty object`, function() {
                const parsedData = bodyParser.parseUrlEncoded('');
                expect(parsedData).to.deep.equals({});
            });
        });

        describe('#parseJSON(string)', function() {
            it(`should decode the json string given, and return the result`, function() {
                const parsedJSON = bodyParser.parseJSON(JSON.stringify(data));
                expect(parsedJSON).to.deep.equals(data);
            });

            it(`should catch all errors if the passed in string is not a valid json and return
                an empty object`, function() {

                let parsedJSON = bodyParser.parseJSON('{name: \'harry\'}');
                expect(parsedJSON).to.deep.equals({});
            });
        });

        describe('parse(buffer, contentType)', function() {
            it(`should call parseJSON if the contentType is either text/json or application/json.`, function(){

                sinon.spy(bodyParser, 'parseJSON');

                const result = bodyParser.parse(Buffer.from(JSON.stringify(data)), 'text/json');

                expect(result.body).to.deep.equals(data);

                expect(bodyParser.parseJSON.callCount).to.equal(1);
                bodyParser.parseJSON.restore();
            });

            it(`should call parseUrlEncoded if content type is either text/plain or
                application/x-www-form-urlencoded`, function(){

                sinon.spy(bodyParser, 'parseUrlEncoded');

                bodyParser.parse('', 'application/x-www-form-urlencoded');
                const result = bodyParser.parse(dataToBuffer(), 'text/plain');

                expect(result.body).to.deep.equals(data);

                expect(bodyParser.parseUrlEncoded.callCount).to.equal(2);
                bodyParser.parseUrlEncoded.restore();
            });

            it(`should call parseMultiPart if content type is multipart/form-data`, function(){

                const filePath = path.resolve(__dirname, '../../helpers/multipart.log'),
                    boundary = '----WebKitFormBoundaryAw0u9Lykfr41KdqS';

                sinon.spy(bodyParser, 'parseMultiPart');

                const result = bodyParser.parse(
                    Buffer.from(fs.readFileSync(filePath, 'latin1'), 'latin1'),
                    'multipart/form-data; boundary=' + boundary
                );

                expect(result.body).deep.equals(data);
                expect(bodyParser.parseMultiPart.calledOnce).to.be.true;
                bodyParser.parseMultiPart.restore();
            });

            it(`should call parseMultiPart if content type is multipart/form-data even when the
            boundary header is not given`, function(){

                const filePath = path.resolve(__dirname, '../../helpers/multipart.log');

                sinon.spy(bodyParser, 'parseMultiPart');

                const result = bodyParser.parse(
                    Buffer.from(fs.readFileSync(filePath, 'latin1'), 'latin1'),
                    'multipart/form-data'
                );

                expect(result.body).deep.equals(data);
                expect(bodyParser.parseMultiPart.calledOnce).to.be.true;
                bodyParser.parseMultiPart.restore();
            });

            it(`should run no parse if the content type does not match any of the above`, function(){
                const filePath = path.resolve(__dirname, '../../helpers/multipart.log'),
                    result = bodyParser.parse(
                        Buffer.from(fs.readFileSync(filePath, 'latin1'), 'latin1'),
                        ''
                    );

                expect(result).deep.equals({
                    body: {},
                    files: {}
                });
            });
        });
    });
});