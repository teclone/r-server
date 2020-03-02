import { ErrorCallback } from '../@types';
import Request from './Request';
import Logger from './Logger';
import Response from './Response';
import EntityTooLargeException from '../Exceptions/EntityTooLargeException';
import { isString } from '@teclone/utils';

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
  code?: number,
): Promise<boolean> => {
  err = isString(err) ? new Error(err) : err;
  logger.fatal(err);
  if (!response.finished) {
    return (callback || errorCallback)(err, request, response, code);
  } else {
    return Promise.resolve(true);
  }
};
