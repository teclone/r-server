import { Callback, Middleware, RServerConfig } from '../../src/@types';
import * as path from 'path';
import { Server } from '../../src/modules/Server';
import request from 'request-promise';

export const dummyCallback: Callback = (req, res) => Promise.resolve(true);

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

export const httpsEnabledConfig: RServerConfig = {
  https: {
    enabled: true,
  },
};

export const withTeardown = (server: Server, test: Promise<void>) => {
  return test
    .then(() => server.close())
    .catch((ex) => {
      return server.close().then(() => {
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
