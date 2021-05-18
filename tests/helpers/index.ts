import { Callback, Middleware, Next, Config } from '../../src/@types';
import { Request } from '../../src/modules/Request';
import { Response } from '../../src/modules/Response';
import * as path from 'path';
import { App } from '../../src/modules/App';
import request from 'request-promise';

export const dummyCallback: Callback = (req: Request, res: Response) =>
  Promise.resolve(true);

export const dummyMiddleware: Middleware = (req, res, next) => {
  return next();
};

export const httpHost = 'http://localhost:8000/';

export const httpsHost = 'https://localhost:9000/';

export const multipartLogFile = path.resolve(__dirname, 'multipart.log');

export const multipartLogFileNoBoundary = path.resolve(
  __dirname,
  'multipart_noboundary.log'
);

export const multipartBoundary = '----WebKitFormBoundarybEguVvbADThWNOxz';

export const httpsEnabledConfig: Config = {
  https: {
    enabled: true,
  },
};

export const withTeardown = (app: App, test: Promise<void>) => {
  return test
    .then(() => app.close())
    .catch((ex) => {
      return app.close().then(() => {
        throw ex;
      });
    });
};

// @ts-ignore
export const sendRequest: typeof request = (args) => {
  return request({ resolveWithFullResponse: true, simple: false, ...args });
};

export const resolvePath = (filePath: string) => {
  return path.resolve(__dirname, '../../', filePath);
};
