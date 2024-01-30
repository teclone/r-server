import { EntityTooLargeException } from '../Exceptions/EntityTooLargeException';
import { isString } from '@teclone/utils';
import { ServerResponse } from './Response';

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
    errors:
      process.env.NODE_ENV === 'production'
        ? null
        : {
            stack: err?.stack || '',
          },
  });
};
