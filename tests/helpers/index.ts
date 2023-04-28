import { Callback, Middleware, RServerConfig } from '../../src/@types';
import * as path from 'path';
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

// @ts-ignore
export const sendRequest: typeof request = (args) => {
  return request({
    resolveWithFullResponse: true,
    rejectUnauthorized: false,
    ...args,
  });
};

const me = new Promise(() => {});

export const withReject = async (callback: () => Promise<any>) => {
  let ex;
  let thrown = false;
  try {
    await callback();
  } catch (exception) {
    ex = exception;
    thrown = true;
  }

  if (!thrown) {
    throw new Error('Expected callback to throw but did not');
  }

  return ex;
};

export const withResolve = async (callback: () => Promise<any>) => {
  let ex;
  let thrown = false;
  try {
    const res = await callback();
    return res;
  } catch (exception) {}

  if (thrown) {
    throw new Error('Expected callback to not throw but it did');
  }

  return;
};

export const resolvePath = (filePath: string) => {
  return path.resolve(__dirname, '../../', filePath);
};
