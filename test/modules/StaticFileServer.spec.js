import StaticFileServer from '../../src/modules/StaticFileServer.js';
import path from 'path';
import fs from 'fs';

describe('StaticFileServer', function() {
    let staticFileServer = null,
    response = null;

    beforeEach(function() {
        staticFileServer = new StaticFileServer(path.resolve(__dirname, '../../'), [
            './', 'public'
        ], {
            'json': 'application/json',
            'html': 'text/html',
            'xml': 'text/xml',
            'js': 'text/javascript',
            'css': 'text/css',
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'png': 'image/png'
        }, ['index.html', 'main.js']);

        response = {
            ended: false,
            data: null,
            headers: null,
            status: 0,
            end: function(data) {
                this.data = data? data : null;
                this.ended = true;
            },
            writeHead: function(status, headers) {
                this.status = status;
                this.headers = headers;
            }
        };
    });

    describe('#constructor(rootDir, publicPaths, mimeTypes, defaultDocuments)', function() {
        it(`should create a static file server instance`, function() {
            expect(staticFileServer).to.be.a('StaticFileServer');
        });
    });

    describe('#endResponse(response, status, headers?, data?)', function() {
        it (`should end the response with the status code given, headers and data`, function() {
            staticFileServer.endResponse(response, 200, null, 'Hello World');
            expect(response.status).to.equals(200);
            expect(response.headers).to.deep.equals({});
            expect(response.data).to.be.equals('Hello World');
        });

        it (`should end the response with the status code, headers and without any data if data
            parameter is not specified`, function() {
            staticFileServer.endResponse(response, 304, {'Content-Type': 'text/html'});
            expect(response.data).to.be.null;
        });
    });

    describe('#negotiateContent(headers, eTag, fileMTime)', function() {
        it (`should negotiate the content by checking for an if-none-match header fields and if
            it tallies with the file's calculated eTag. It should return true if it tallies`, function() {
            expect(staticFileServer.negotiateContent({
                'if-none-match': 'blablabla'
            }, 'blablabla')).to.be.true;
        });

        it (`should negotiate the content by checking for an if-modified-since header fields and if
            it tallies with the file's last modified time. It should return true if it tallies`, function() {
            expect(staticFileServer.negotiateContent({
                'if-modified-since': 'Wed Jul 18 2018 14:37:47 GMT+0100 (West Africa Standard Time)'
            }, 'blablabla', 'Wed Jul 18 2018 14:37:47 GMT')).to.be.true;
        });

        it (`It should return false if otherwise`, function() {
            expect(staticFileServer.negotiateContent({
                'if-none-match': 'blablabla'
            }, 'blablabla2')).to.be.false;
        });
    });

    describe('#getFileTag(fileMTime, length = 16)', function() {
        it (`should generate an etag for the file using the file's last modification
            time as the hash update input. The returned hash should be sized to the given length
            which defaults to 16`, function() {
            expect(staticFileServer.getFileTag(20202020))
                .to.be.a('string').and.lengthOf(16);
        });

        it (`should use the given length and size the generated tag to it`, function() {
            expect(staticFileServer.getFileTag(20202020, 12))
                .to.be.a('string').and.lengthOf(12);
        });
    });

    describe('#getDefaultDocument(dir)', function() {
        it (`should search for a default document in the given directory and return it`, function() {
            let dir = path.resolve(__dirname, '../../src');
            expect(staticFileServer.getDefaultDocument(dir)).to.equals('main.js');
        });

        it(`should return empty string if no specified default documents exist inside
            the directory`, function() {
            let dir = path.resolve(__dirname, '../../src/modules');
            expect(staticFileServer.getDefaultDocument(dir)).to.equals('');
        });
    });

    describe('#validateRequest(url, method)', function() {
        it(`should validate the request and return valid public file  path that
            matches the requested file`, function() {
            let requestUrl = '/package.json';
            expect(staticFileServer.validateRequest(requestUrl, 'GET'))
                .to.equals(path.resolve(__dirname, '../../package.json'));
        });

        it(`should return empty string if the request's method is neither GET, HEAD nor
            OPTIONS method`, function() {
            expect(staticFileServer.validateRequest('index.html', 'POST')).to.equals('');
        });

        it(`should run the process and check for default documents if the request url
            points to a folder in one of the public paths`, function() {
            let requestUrl = '/src';
            expect(staticFileServer.validateRequest(requestUrl, 'GET'))
                .to.equals(path.resolve(__dirname, '../../src/main.js'));
        });

        it(`should run the process and return empty string no default documents was found for
            the request url that points to a folder in one of the public paths`, function() {
            let requestUrl = '/src/modules';
            expect(staticFileServer.validateRequest(requestUrl, 'GET'))
                .to.equals('');
        });

        it(`should run the process and return empty string for every request made outside the
            specified public paths.`, function() {
            let staticFileServer = new StaticFileServer(path.resolve(__dirname, '../../'), [
                'test'
            ], null, ['index.js', 'main.js', 'setup.js']);

            expect(staticFileServer.validateRequest('package.json', 'GET'))
                .to.equals('');
            expect(staticFileServer.validateRequest('/src', 'GET'))
                .to.equals('');

            expect(staticFileServer.validateRequest('/setup.js', 'GET'))
                .to.equals(path.resolve(__dirname, '../../test/setup.js'));
        });

        it(`should run the process and return empty string for every request made for server
        files that starts with .`, function() {
            expect(staticFileServer.validateRequest('.eslintrc.json', 'GET'));
            expect(staticFileServer.validateRequest('.gitignore', 'GET'));
        });
    });

    describe('#serve(url, method, headers, response)', function() {
        it(`should run an integrated process, serving the file if all conditions are met, responding
        to head, options, and get request as appropriate or decline the request. It
            returns a boolean`, function() {
            let status = staticFileServer.serve('package.json', 'GET', {}, response);
            expect(status).to.be.true;
            expect(response.data).to.deep.equals(
                fs.readFileSync(path.resolve(__dirname, '../../package.json')));

            expect(response.status).to.equals(200);

            expect(response.headers['Content-Type']).to.equals('application/json');
            expect(response.ended).to.be.true;
        });

        it(`should return content type text/plain if files mime type is not found within the
            list of mime types`, function() {
            let status = staticFileServer.serve('LICENSE', 'GET', {}, response);
            expect(status).to.be.true;
            expect(response.data).to.deep.equals(
                fs.readFileSync(path.resolve(__dirname, '../../LICENSE')));

            expect(response.status).to.equals(200);

            expect(response.headers['Content-Type']).to.equals('text/plain');
            expect(response.ended).to.be.true;
        });

        it(`should run an integrated process, and return false if the request fails validation`, function() {
            let status = staticFileServer.serve('package.json', 'POST', {}, response);
            expect(status).to.be.false;
            expect(response.ended).to.be.false;
        });

        it(`should run an integrated process, and respond to OPTIONS requests, letting the client
            know which request methods are allowed without sending any data`, function() {
            let status = staticFileServer.serve('package.json', 'OPTIONS', {}, response);
            expect(status).to.be.true;
            expect(response.ended).to.be.true;
            expect(response.headers).to.deep.equals({
                Allow: 'OPTIONS, HEAD, GET, POST'
            });
            expect(response.data).to.be.null;
        });

        it(`should run an integrated process, and respond to HEAD requests, sending resource
            meta headers without sending the content`, function() {
            let filePath = path.resolve(__dirname, '../../package.json'),
            stat = fs.statSync(filePath);

            let status = staticFileServer.serve('package.json', 'HEAD', {}, response);
            expect(status).to.be.true;
            expect(response.ended).to.be.true;

            expect(response.headers['Content-Type']).to.equals('application/json');
            expect(response.headers['Last-Modified']).to.deep.equals(stat.mtime);
            expect(response.headers['ETag']).to.equals(
                staticFileServer.getFileTag(stat.mtime));

            expect(response.headers['Cache-Control']).to.equals('no-cache, max-age=86400');
            expect(response.data).to.be.null;
        });

        it(`should run an integrated process, negotiate content and respond with a 304 response
        header status if content negotiation succeeds`, function() {
            //serve the first file.
            let status = staticFileServer.serve('package.json', 'HEAD', {}, response);

            expect(status).to.be.true;
            expect(response.ended).to.be.true;
            expect(response.status).to.equals(200);

            //
            status = staticFileServer.serve('package.json', 'HEAD', {
                'if-none-match': response.headers['ETag']}, response);

            expect(status).to.be.true;
            expect(response.ended).to.be.true;
            expect(response.status).to.equals(304);
            expect(response.data).to.be.null;
        });
    });

    describe('#serveHttpErrorFile(response, status, baseDir?, filePath?)', function() {
        it(`should asynchronously server the user defined http error file that is mapped for the given
            status error code, and return a promise, passing in the response object`, function() {
            return staticFileServer.serveHttpErrorFile(response, 404, '', 'test/helpers/404.html')
                .then((response) => {
                    expect(response.ended).to.be.true;
                });
        });

        it(`should asynchronously server the internal error file that is mapped for the given
            status error code, if user did not specify any file in the config file`, function() {
            return staticFileServer.serveHttpErrorFile(response, 404)
                .then((response) => {
                    expect(response.ended).to.be.true;
                });
        });

        it(`should send an empty content with the appropriate error status header if user
            defined error file does not exists`, function() {
            return staticFileServer.serveHttpErrorFile(response, 404, '', 'test/helpers/401.html')
                .then((response) => {
                    expect(response.ended).to.be.true;
                    expect(response.data).to.be.null;
                });
        });

        it(`should send an file with content type set to text/plain if user defined file has
            no extension part.`, function() {
            return staticFileServer.serveHttpErrorFile(response, 404, '', 'LICENSE')
                .then((response) => {
                    expect(response.ended).to.be.true;
                    expect(response.headers['Content-Type']).to.equals('text/plain');
                });
        });
    });
});