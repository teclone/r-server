import RServerResponse from '../../src/modules/RServerResponse.js';
import StaticFileServer from '../../src/modules/StaticFileServer.js';
import path from 'path';

describe('RServerResponse.spec.js', function() {
    let response = null;

    beforeEach(function() {
        response = new RServerResponse({method: 'GET'});
        response.staticFileServer = new StaticFileServer(
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
        );
    });

    describe('.getClass(staticFileServer)', function() {
        it(`should return return an RServerResponse class`, function() {
            expect(response).to.be.an('RServerResponse');
        });
    });

    describe('#download(filePath, filename, callback)', function() {
        it(`should serve the file referred to by the relative filePath as download attachment to the
        client, suggesting the given filename as what the client should use in saving the
        file.`, function() {
            response.download('package.json', 'node-config.json');
        });
    });
});