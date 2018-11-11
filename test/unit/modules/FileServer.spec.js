import FileServer from '../../../src/modules/FileServer';
import fs from 'fs';
import config from '../../../src/.rsvrc.json';
import Logger from '../../../src/modules/Logger';
import path from 'path';

describe('FileServer Module', function() {
    let fileServer = null;

    beforeEach(function() {
        const errorLog = path.resolve(__dirname, '../../../.error.log'),
            accessLog = path.resolve(__dirname, '../../../.access.log');

        //clear the files
        fs.writeFileSync(errorLog, '');
        fs.writeFileSync(accessLog, '');

        const logger = new Logger(
            errorLog,
            accessLog,
            config
        );
        fileServer = new FileServer(path.resolve(__dirname, '../../../'), config, logger);
    });

    describe('#constructor(rootDir, config, logger)', function() {
        it(`should create a static file server instance`, function() {
            expect(fileServer).to.be.a('FileServer');
        });
    });

    describe('#getFileTag(fileMTime, length = 16)', function() {
        it (`should generate an etag for the file using the file's last modification
            time as the hash input. The returned hash should be sized to the given length
            which defaults to 16`, function() {
            expect(fileServer.getFileTag(20202020))
                .to.be.a('string').and.lengthOf(16);
        });

        it (`should use the given length and size the generated tag to it`, function() {
            expect(fileServer.getFileTag(20202020, 12))
                .to.be.a('string').and.lengthOf(12);
        });
    });

    describe('#getDefaultHeaders(filePath)', function() {
        let filePath = '';
        beforeEach(function() {
            filePath = path.resolve(__dirname, '../../../package.json');
        });

        it('should return the default response headers for the given file', function() {
            const stat = fs.statSync(filePath),
                resHeaders = fileServer.getDefaultHeaders(filePath);

            expect(resHeaders).to.deep.equals({
                'Content-Type': 'application/json',
                'Content-Length': stat.size,
                'Last-Modified': stat.mtime.toString(),
                'ETag': fileServer.getFileTag(stat.mtime),
                'Cache-Control': 'no-cache, max-age=86400'
            });
        });

        it('should set the Content-Type to application/octet-stream if file has no extension', function() {
            const filePath = path.resolve(__dirname, '../../../LICENSE'),
                resHeaders = fileServer.getDefaultHeaders(filePath);

            expect(resHeaders['Content-Type']).to.equals('application/octet-stream');
        });
    });

    describe('#getDefaultDocument(dir)', function() {
        it (`should search for a default document in the given directory and return it`, function() {
            const dir = path.resolve(__dirname, '../../../public');
            expect(fileServer.getDefaultDocument(dir)).to.equals('index.html');
        });

        it(`should return empty string if no specified default documents exist inside
            the directory`, function() {
            const dir = path.resolve(__dirname, '../../../src/modules');
            expect(fileServer.getDefaultDocument(dir)).to.equals('');
        });
    });

    describe('#validateRequest(url, method)', function() {
        it(`should validate the request and return valid public file path that
            matches the requested file`, function() {
            expect(fileServer.validateRequest('/index.html', 'GET'))
                .to.equals(path.resolve(__dirname, '../../../public/index.html'));
        });

        it(`should return empty string if the request's method is neither GET, HEAD nor
            OPTIONS method`, function() {
            expect(fileServer.validateRequest('index.html', 'POST')).to.equals('');
        });

        it(`should run the process and check for default documents if the request url
            points to a folder in one of the public paths`, function() {
            expect(fileServer.validateRequest('/', 'GET'))
                .to.equals(path.resolve(__dirname, '../../../public/index.html'));
        });

        it(`should run the process and return empty string if no default documents was found for
            the request url that points to a folder in one of the public paths`, function() {
            expect(fileServer.validateRequest('/src', 'GET'))
                .to.equals('');
        });

        it(`should run the process and return empty string for every request made for server
        files that starts with .`, function() {
            expect(fileServer.validateRequest('.eslintrc.json', 'GET')).to.equals('');
            expect(fileServer.validateRequest('.gitignore', 'GET')).to.equals('');
        });
    });

    describe('#negotiateContent(headers, eTag, fileMTime)', function() {
        it (`should negotiate the content by checking for an if-none-match header fields and if
            it tallies with the file's calculated eTag. It should return true if it tallies`, function() {
            expect(fileServer.negotiateContent({
                'if-none-match': 'blablabla'
            }, 'blablabla')).to.be.true;
        });

        it (`should negotiate the content by checking for an if-modified-since header fields and if
            it tallies with the file's last modified time. It should return true if it tallies`, function() {
            expect(fileServer.negotiateContent({
                'if-modified-since': 'Wed Jul 18 2018 14:37:47 GMT+0100 (West Africa Standard Time)'
            }, 'blablabla', 'Wed Jul 18 2018 14:37:47 GMT+0100 (West Africa Standard Time)')).to.be.true;
        });

        it (`It should return false if otherwise`, function() {
            expect(fileServer.negotiateContent({
                'if-none-match': 'blablabla'
            }, 'blablabla2')).to.be.false;
        });
    });
});