import RServerResponse from '../../src/modules/RServerResponse.js';
import StaticFileServer from '../../src/modules/StaticFileServer.js';
import path from 'path';

describe('RServerResponse.spec.js', function() {
    let RServerResponseClass = null;

    beforeEach(function() {
        RServerResponseClass = RServerResponse.getClass(
            new StaticFileServer(
                path.resolve(__dirname, '../../'), [
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
                }, [
                    'index.html', 'main.js'
                ]
            )
        );
    });

    describe('.getClass(staticFileServer)', function() {
        it(`should return return an RServerResponse class`, function() {
            expect(getInstance(RServerResponseClass, {method: 'GET'})).to.be.an('RServerResponse');
        });
    });

    describe('#download(filePath, filename, callback)', function() {
        it(`should serve the file referred to by the relative filePath as download attachment to the
        client, suggesting the given filename as what the client should use in saving the
        file.`, function() {

            let response = new RServerResponseClass({method: 'GET'});

            response.download('package.json', 'node-config.json');
        });
    });
});