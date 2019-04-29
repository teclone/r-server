import { Callback, Middleware, Next, Config } from '../../src/@types';
import Request from '../../src/modules/Request';
import Response from '../../src/modules/Response';
import * as path from 'path';
import Server from '../../src/modules/Server';

export const dummyCallback: Callback = (req: Request, res: Response) => Promise.resolve(true);

export const dummyMiddleware: Middleware = (req: Request, res: Response, next: Next): void => {
    next();
};

export const entryPath = path.resolve(__dirname, '../../');

export const httpHost = 'http://localhost:8000/';

export const httpsHost = 'https://localhost:9000/';

export const multipartLogFile = path.resolve(__dirname, 'multipart.log');

export const multipartLogFileNoBoundary = path.resolve(__dirname, 'multipart_noboundary.log');

export const multipartBoundary = '----WebKitFormBoundarybEguVvbADThWNOxz';

export const httpsEnabledConfig: Config = {
    https: {
        enabled: true
    }
};

export const closeServer = (server: Server, done: () => any) => {
    server.close(() => {
        done();
    });
};