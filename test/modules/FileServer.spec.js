import FileServer from '../../src/modules/FileServer.js';
import path from 'path';
import fs from 'fs';

describe('FileServer', function() {
    let fileServer = null,
        response = null;

    beforeEach(function() {
        fileServer = new FileServer(path.resolve(__dirname, '../../'), [
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
            buffer: [],
            ended: false,
            data: null,
            headers: null,
            status: 0,

            set statusCode(code) {
                this.status = code;
            },

            get statusCode() {
                return this.status;
            },

            eventListeners: {},

            end: function(data) {
                this.data = this.buffer.length > 0? Buffer.concat(this.buffer) : null;
                if (typeof data === 'string')
                    this.data = data;
                else if (data instanceof Function)
                    data();

                this.emit('end');
            },

            write(chunk) {
                this.buffer.push(chunk);
            },

            writeHead: function(status, headers) {
                this.status = status;
                this.headers = headers;
            },

            on(event, callback) {
                if (typeof this.eventListeners[event] !== 'undefined')
                    this.eventListeners[event].push(callback);
                else
                    this.eventListeners[event] = [callback];
            },

            once(event, callback) {
                if (typeof this.eventListeners[event] !== 'undefined')
                    this.eventListeners[event].push(callback);
                else
                    this.eventListeners[event] = [callback];
            },

            emit(event) {
                let eventListeners = this.eventListeners[event] || [];
                for (let eventListener of eventListeners) {
                    try {
                        eventListener();
                    }
                    catch(ex){
                        //
                    }
                }
            }
        };
    });

    describe('#constructor(rootDir, publicPaths, mimeTypes, defaultDocuments)', function() {
        it(`should create a static file server instance`, function() {
            expect(fileServer).to.be.a('FileServer');
        });
    });

    describe('#getDefaultHeaders(filePath)', function() {
        it('should return the default response headers for the given file', function() {
            let filePath = path.resolve(__dirname, '../../package.json'),
                stat = fs.statSync(filePath),
                resHeaders = fileServer.getDefaultHeaders(
                    path.resolve(__dirname, '../../package.json'));

            expect(resHeaders).to.deep.equals({
                'Content-Type': 'application/json',
                'Content-Length': stat.size,
                'Last-Modified': stat.mtime.toString(),
                'ETag': fileServer.getFileTag(stat.mtime),
                'Cache-Control': 'no-cache, max-age=86400'
            });
        });

        it('should use set the Content-Type to application/octet-stream if file has no extension', function() {
            let filePath = path.resolve(__dirname, '../../LICENSE'),
                resHeaders = fileServer.getDefaultHeaders(filePath);

            expect(resHeaders['Content-Type']).to.equals('application/octet-stream');
        });
    });

    describe('#endStream(filePath, response, status, headers, callback)', function() {
        it(`should end the response by sending a file using node.js inbuild steam functionality.
            It should call the callback once the process completes`, function(done) {
            let filePath = path.resolve(__dirname, '../../package.json');
            fileServer.endStream(filePath, response, 200, {}, function() {
                done();
            });
        });

        it(`should use a dummy callback function if no callback is specified.`, function() {
            let filePath = path.resolve(__dirname, '../../package.json');
            fileServer.endStream(filePath, response, 200, {});
        });
    });

    describe('#endResponse(response, status, headers?, data?)', function() {
        it (`should end the response with the status code given, headers and data`, function() {
            fileServer.endResponse(response, 200, null, 'Hello World');
            expect(response.status).to.equals(200);
            expect(response.headers).to.deep.equals({});
            expect(response.data).to.be.equals('Hello World');
        });

        it (`should end the response with the status code, headers and without any data if data
            parameter is not specified`, function() {
            fileServer.endResponse(response, 304, {'Content-Type': 'text/html'});
            expect(response.data).to.be.null;
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

    describe('#getFileTag(fileMTime, length = 16)', function() {
        it (`should generate an etag for the file using the file's last modification
            time as the hash update input. The returned hash should be sized to the given length
            which defaults to 16`, function() {
            expect(fileServer.getFileTag(20202020))
                .to.be.a('string').and.lengthOf(16);
        });

        it (`should use the given length and size the generated tag to it`, function() {
            expect(fileServer.getFileTag(20202020, 12))
                .to.be.a('string').and.lengthOf(12);
        });
    });

    describe('#getDefaultDocument(dir)', function() {
        it (`should search for a default document in the given directory and return it`, function() {
            let dir = path.resolve(__dirname, '../../src');
            expect(fileServer.getDefaultDocument(dir)).to.equals('main.js');
        });

        it(`should return empty string if no specified default documents exist inside
            the directory`, function() {
            let dir = path.resolve(__dirname, '../../src/modules');
            expect(fileServer.getDefaultDocument(dir)).to.equals('');
        });
    });

    describe('#validateRequest(url, method)', function() {
        it(`should validate the request and return valid public file  path that
            matches the requested file`, function() {
            let requestUrl = '/package.json';
            expect(fileServer.validateRequest(requestUrl, 'GET'))
                .to.equals(path.resolve(__dirname, '../../package.json'));
        });

        it(`should return empty string if the request's method is neither GET, HEAD nor
            OPTIONS method`, function() {
            expect(fileServer.validateRequest('index.html', 'POST')).to.equals('');
        });

        it(`should run the process and check for default documents if the request url
            points to a folder in one of the public paths`, function() {
            let requestUrl = '/src';
            expect(fileServer.validateRequest(requestUrl, 'GET'))
                .to.equals(path.resolve(__dirname, '../../src/main.js'));
        });

        it(`should run the process and return empty string no default documents was found for
            the request url that points to a folder in one of the public paths`, function() {
            let requestUrl = '/src/modules';
            expect(fileServer.validateRequest(requestUrl, 'GET'))
                .to.equals('');
        });

        it(`should run the process and return empty string for every request made outside the
            specified public paths.`, function() {
            let fileServer = new FileServer(path.resolve(__dirname, '../../'), [
                'test'
            ], null, ['index.js', 'main.js', 'setup.js']);

            expect(fileServer.validateRequest('package.json', 'GET'))
                .to.equals('');
            expect(fileServer.validateRequest('/src', 'GET'))
                .to.equals('');

            expect(fileServer.validateRequest('/setup.js', 'GET'))
                .to.equals(path.resolve(__dirname, '../../test/setup.js'));
        });

        it(`should run the process and return empty string for every request made for server
        files that starts with .`, function() {
            expect(fileServer.validateRequest('.eslintrc.json', 'GET'));
            expect(fileServer.validateRequest('.gitignore', 'GET'));
        });
    });

    describe('#serve(url, method, headers, response, callback?)', function() {
        it(`should run an integrated process, serving the file if all conditions are met, responding
        to head, options, and get requests as appropriate or decline the request. It
        return a boolean`, function(done) {
            let filePath = path.resolve(__dirname, '../../package.json');

            let status = fileServer.serve(
                'package.json', 'GET', {}, response, function() {
                    if (status !== true)
                        done(new Error('#serve sent incorrect return type'));

                    else if (response.status !== 200)
                        done(new Error('#serve sent incorrect status code'));

                    else if (response.headers['Content-Type'] !== 'application/json')
                        done(new Error('#serve sent incorrect content-type'));

                    else if (response.data.toString() !== fs.readFileSync(filePath).toString())
                        done(new Error('#serve sent incorrect file content buffer'));

                    else
                        done();
                }
            );
        });

        it(`should return content type application/octet-stream if files mime type is not found within the
        list of mime types`, function(done) {
            fileServer.serve(
                'LICENSE', 'GET', {}, response, function() {
                    if (response.headers['Content-Type'] !== 'application/octet-stream')
                        done(new Error('#serve sent incorrect content-type'));

                    else
                        done();
                }
            );
        });

        it(`should run an integrated process, and return false if the request fails validation`, function() {
            let status = fileServer.serve('package.json', 'POST', {}, response);
            expect(status).to.be.false;
        });

        it(`should run an integrated process, and respond to OPTIONS requests, letting the client
        know which request methods are allowed without sending any data`, function(done) {
            fileServer.serve(
                'package.json', 'OPTIONS', {}, response, function() {
                    if (response.headers['Allow'] !== 'OPTIONS, HEAD, GET, POST')
                        done(new Error('#serve sent incorrect server allow head for options request'));

                    else
                        done();
                }
            );
        });

        it(`should run an integrated process, and respond to HEAD requests, sending resource
        meta headers without sending the content`, function(done) {
            let filePath = path.resolve(__dirname, '../../package.json'),
                stat = fs.statSync(filePath);

            fileServer.serve(
                'package.json', 'HEAD', {}, response, function() {
                    let headers = response.headers;

                    if (response.data !== null)
                        done(new Error('#serve sent data for a head request when it should not'));

                    else if (response.status !== 200)
                        done(new Error('#serve sent incorrect status code'));

                    else if (headers['Content-Type'] !== 'application/json')
                        done(new Error('#serve sent incorrect content-type'));

                    else if (headers['Last-Modified'].toString() !== stat.mtime.toString())
                        done(new Error('#serve sent incorrect file Last-Modified date'));

                    else if (headers['ETag'] !== fileServer.getFileTag(stat.mtime))
                        done(new Error('#serve sent incorrect file ETag computed hash'));

                    else if (headers['Cache-Control'] !== 'no-cache, max-age=86400')
                        done(new Error('#serve sent incorrect cache-control header'));

                    else
                        done();
                }
            );
        });

        it(`should run an integrated process, negotiate content and respond with a 304 response
        header status if content negotiation succeeds`, function(done) {

            //serve the first file.
            fileServer.serve(
                'package.json', 'GET', {}, response, function() {
                    //serve the same file the second time
                    let headers = {};
                    response.buffer = []; //empty buffer
                    for(let [key, value] of Object.entries(response.headers)) {
                        key = key.toLowerCase();
                        if (key === 'last-modified')
                            headers['if-modified-since'] = value;
                        else if (key === 'etag')
                            headers['etag'] = value;
                        else
                            headers[key] = value;
                    }

                    fileServer.serve('package.json', 'GET', headers, response, function() {
                        if (response.status !== 304)
                            done(new Error(`#serve sent incorrect response status code, when
                                it suppose to negotiate content`));

                        else if (response.data !== null)
                            done(new Error('#serve sent data for a 304 response when it should not'));

                        else
                            done();
                    });
                }
            );
        });
    });

    describe('#serveHttpErrorFile(response, status, baseDir?, filePath?, callback?)', function() {
        it(`should asynchronously server the user defined http error file that is mapped for the given
            status error code`, function(done) {
            fileServer.serveHttpErrorFile(response, 404, '',
                'test/helpers/404.html', function() {
                    done();
                }
            );
        });

        it(`should asynchronously server the default internal error file that is mapped for the given
            status error code, if none is defined by the web master`, function(done) {
            fileServer.serveHttpErrorFile(response, 404, '', '', function() {
                done();
            });
        });

        it(`should send an empty content with the appropriate error status header if user
            defined error file does not exist`, function(done) {
            fileServer.serveHttpErrorFile(response, 404, '', 'test/helpers/401.html', function() {
                if (response.status === 404)
                    done();
                else
                    done(new Error('incorrect response status code sent'));
            });
        });
    });

    describe('#serveDownload(response, filePath, filename?, callback?)', function() {
        it(`should serve the file referred to by the relative filePath as download attachment to the
        client, suggesting the given filename as what the client should use in saving the
        file. `, function(done) {
            fileServer.serveDownload(response, 'package.json', 'node-config.json',
                function() {
                    if (response.headers['Content-Disposition'] ===
                        'attachment; filename="node-config.json"')
                        done();
                    else
                        done(new Error('wrong content-disposition header sent'));
                }
            );
        });

        it(`should default to the files base name if no filename is provided.`, function(done) {
            fileServer.serveDownload(response, 'package.json', '',
                function() {
                    if (response.headers['Content-Disposition'] ===
                        'attachment; filename="package.json"')
                        done();
                    else
                        done(new Error('wrong content-disposition header sent'));
                }
            );
        });

        it(`should simply end the response if the specified file does not exist.`, function(done) {
            fileServer.serveDownload(response, 'packag.json', 'node-config.json',
                function() {
                    if (response.data !== null)
                        done(new Error('#serveDownload sent data when file does not actually exist'));
                    else
                        done();
                }
            );
        });
    });
});