import Response from '../../src/modules/Response.js';
import FileServer from '../../src/modules/FileServer.js';
import path from 'path';

describe('Response.spec.js', function() {
    let response = null;

    beforeEach(function() {
        response = new Response({method: 'GET'});
        response.fileServer = new FileServer(
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

    describe('#download(filePath, filename, callback)', function() {
        it(`should serve the file referred to by the relative filePath as download attachment to the
        client, suggesting the given filename as what the client should use in saving the
        file.`, function() {
            response.download('package.json', 'node-config.json');
        });
    });
});