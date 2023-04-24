import { Method, Routes, ServerResponse } from '../@types';
import { EntityTooLargeException } from '../Exceptions/EntityTooLargeException';
import { isString, makeArray } from '@teclone/utils';
import { ROUTE_KEYS } from './Constants';

export const handleError = (
  err: Error | string,
  response: ServerResponse,
  code?: number
): Promise<boolean> => {
  const request = response.req;
  const logger = response.logger;
  const errorCallback = response.errorCallback;

  err = isString(err) ? new Error(err) : err;
  logger.logError(err);

  if (response.writableEnded || response.finished) {
    return Promise.resolve(true);
  }

  if (errorCallback) {
    return errorCallback(err, request, response, code);
  }

  if (err instanceof EntityTooLargeException) {
    return response.jsonError({
      statusCode: 413,
      message: err.message,
    });
  }

  return response.jsonError({
    statusCode: code || 500,
    message: 'internal server error',
    data:
      process.env.NODE_ENV === 'production'
        ? null
        : {
            errorStack: err?.stack || '',
          },
  });
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
