import { ErrorCallback, Method, Routes } from '../@types';
import { EntityTooLargeException } from '../Exceptions/EntityTooLargeException';
import { isString, makeArray } from '@teclone/utils';
import { ROUTE_KEYS } from './Constants';
import type { Logger } from './Logger';
import type { Request } from './Request';
import type { Response } from './Response';

/**
 * global callback error handler
 * @param req
 * @param res
 */
let errorCallback: ErrorCallback = (err, req, res, code) => {
  if (err instanceof EntityTooLargeException) {
    return res.jsonError(413, err.message);
  }

  return res.jsonError(code || 500, 'internal server error');
};

export const setErrorCallback = (callback: ErrorCallback) => {
  errorCallback = callback;
};

export const handleError = (
  err: Error | string,
  callback: ErrorCallback | null,
  logger: Logger,
  request: Request,
  response: Response,
  code?: number
): Promise<boolean> => {
  err = isString(err) ? new Error(err) : err;
  logger.fatal(err);

  if (response.writableEnded || response.finished) {
    return Promise.resolve(true);
  } else {
    return (callback || errorCallback)(err, request, response, code);
  }
};

export const getRouteKeys = (
  method: Method | Method[] = '*'
): Array<keyof Routes> => {
  method = makeArray(method);
  if (method.findIndex((current) => current === '*') > -1) {
    return ROUTE_KEYS;
  } else {
    return method as Array<keyof Routes>;
  }
};
