import { EntityTooLargeException } from '../Exceptions/EntityTooLargeException';
import { isString } from '@teclone/utils';
import { ServerResponse } from './Response';
import { brotliDecompress, unzip } from 'node:zlib';

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

export async function deCompressBuffer(
  buffer: Buffer,
  contentEconding: string
) {
  function runDecompress(currentBuffer: Buffer, currentEncoding: string) {
    return new Promise<Buffer>((resolve, reject) => {
      const handler = (err, buffer) => {
        if (err) {
          return reject(err);
        }
        return resolve(buffer);
      };

      switch (currentEncoding) {
        case 'br':
          brotliDecompress(currentBuffer, handler);
          break;

        case 'gzip':
        case 'deflate':
          unzip(currentBuffer, handler);
          break;

        default:
          resolve(currentBuffer);
          break;
      }
    });
  }

  if (!buffer.length || !contentEconding) {
    return buffer;
  }

  const encodings = contentEconding.split(/\s*,\s*/gi);

  let result = buffer;
  for (const encoding of encodings) {
    result = await runDecompress(result, encoding);
  }

  return result;
}
