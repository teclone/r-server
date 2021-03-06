import { Callback, Middleware, Next, Config } from '../../src/@types';
import Request from '../../src/modules/Request';
import Response from '../../src/modules/Response';
import * as path from 'path';
import App from '../../src/modules/App';

export const dummyCallback: Callback = (req: Request, res: Response) => Promise.resolve(true);

export const dummyMiddleware: Middleware = (req: Request, res: Response, next: Next): void => {
  next();
};

export const httpHost = 'http://localhost:8000/';

export const httpsHost = 'https://localhost:9000/';

export const multipartLogFile = path.resolve(__dirname, 'multipart.log');

export const multipartLogFileNoBoundary = path.resolve(__dirname, 'multipart_noboundary.log');

export const multipartBoundary = '----WebKitFormBoundarybEguVvbADThWNOxz';

export const httpsEnabledConfig: Config = {
  https: {
    enabled: true,
  },
};

export const closeApp = (app: App, done: () => any) => {
  app.close(() => {
    done();
  });
};

export const resolvePath = (filePath: string) => {
  return path.resolve(__dirname, '../../', filePath);
};
