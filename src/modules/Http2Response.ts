import { isString, isCallable } from '@teclone/utils';
import type { FileServer } from './FileServer';
import { ErrorCallback } from '../@types';
import type { Logger } from './Logger';
import { handleError } from './Utils';
import { Http2ServerResponse } from 'http2';
import { RouteResponse } from './Http1Response';
import type { Http2Request } from './Http2Request';

export class Http2Response extends Http2ServerResponse {
  req: Http2Request;

  logger: Logger;

  fileServer: FileServer;

  errorCallback: ErrorCallback | null = null;

  startedAt: Date;

  endedAt: Date;

  // @ts-ignore
  end(cb?: () => void): Promise<boolean>;

  // @ts-ignore
  end(data?: any, cb?: () => void): Promise<boolean>;

  // @ts-ignore
  end(
    data?: any,
    encoding?: string | (() => void),
    cb?: () => void
  ): Promise<boolean>;

  /**
   * ends the response with optional response data, and optional data encoding
   * @param data optional data to send. either string or buffer
   * @param encoding data encoding if not buffer
   */
  // @ts-ignore
  end(
    data,
    encoding?: BufferEncoding | (() => void),
    cb?: () => void
  ): Promise<boolean> {
    let resolvedData: string | Buffer | Uint8Array = null;
    let resolvedEncoding: BufferEncoding;

    let resolvedCb = null;

    // first implementation
    if (isCallable(data)) {
      resolvedCb = data;
    } else {
      resolvedData = data;
    }

    if (isString(encoding)) {
      resolvedEncoding = encoding;
    } else if (isCallable(encoding)) {
      resolvedCb = encoding;
    }

    if (isCallable(cb)) {
      resolvedCb = cb;
    }

    if (
      resolvedData &&
      !Buffer.isBuffer(resolvedData) &&
      !isString(resolvedData)
    ) {
      resolvedData = JSON.stringify(resolvedData);
    }

    return new Promise((resolve) => {
      const resolvePromise = () => {
        resolve(true);
        if (resolvedCb) {
          resolvedCb();
        }
      };

      if (encoding) {
        super.end(resolvedData, resolvedEncoding, resolvePromise);
      } else {
        super.end(resolvedData, resolvePromise);
      }
    });
  }

  /**
   * sets response header
   * @param name response header name
   * @param value response header value
   */
  setHeader(name: string, value: string | number | string[]): this {
    super.setHeader(name, value);
    return this;
  }

  /**
   * sets multiple response headers
   * @param headers object containing response header name value pairs
   */
  setHeaders(headers: { [p: string]: string | number | string[] }): this {
    Object.keys(headers || {}).forEach((key) => {
      this.setHeader(key, headers[key]);
    });
    return this;
  }

  /**
   * removes a single set response header at a time. function is chainable
   * @param name response header to remove
   */
  removeHeader(name: string): this {
    super.removeHeader(name);
    return this;
  }

  /**
   * remove response headers that are already set. function is chainable
   * @param names - comma separated list of header names to remove
   */
  removeHeaders(...names: string[]): this {
    names.forEach((name) => {
      this.removeHeader(name);
    });
    return this;
  }

  /**
   * sets response status code
   * @param code - the response code
   */
  status(code: number): this {
    this.statusCode = code;
    return this;
  }

  /**
   * sends json response back to the client.
   * @param data - the json string or json object which will be stringified
   */
  json(data?: object | string): Promise<boolean> {
    if (!isString(data)) {
      data = JSON.stringify(data || '');
    }
    return this.setHeader('Content-Type', 'application/json').end(data);
  }

  /**
   * Redirect client to the given url
   */
  redirect(path: string, status: number = 302): Promise<boolean> {
    return this.status(status).setHeader('Location', path).end();
  }

  /**
   * sends a file download attachment to the client
   * @param filePath - relative or absolute file path
   * @param filename - suggested file download name
   */
  download(filePath: string, filename?: string): Promise<boolean> {
    return this.fileServer.serveDownload(filePath, this, filename);
  }

  /**
   * sends json error data back to the client
   */
  jsonError(response?: RouteResponse): Promise<boolean> {
    const {
      statusCode = 400,
      headers,
      message,
      data = null,
      ttl,
    } = response || {};

    if (statusCode < 300) {
      return this.jsonSuccess(response);
    }

    return this.status(statusCode)
      .setHeaders(headers)
      .json({
        status: 'error',
        statusCode,
        message: message || 'Request failed',
        data,
        ttl,
      });
  }

  /**
   * sends json success data back to the client
   */
  jsonSuccess(response?: RouteResponse): Promise<boolean> {
    const {
      statusCode = 200,
      headers,
      message,
      data = null,
      ttl,
    } = response || {};
    if (statusCode >= 300) {
      return this.jsonError(response);
    }

    return this.status(statusCode)
      .setHeaders(headers)
      .json({
        status: 'success',
        statusCode,
        message: message || 'Request successful',
        data,
        ttl,
      });
  }

  /**
   * waits for the given time
   */
  wait(time: number): Promise<Http2Response> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(this);
      }, time);
    });
  }

  /**
   * it process a json api response, automatically handling
   * the then and catch responses,
   * @param response
   * @returns
   */
  async processRouteResponse<DataType>(
    responsePromise: Promise<RouteResponse<DataType>>,
    options?: {
      onSuccess?: (response: RouteResponse<DataType>) => any;
      onError?: (response: RouteResponse<DataType>) => any;
    }
  ) {
    return responsePromise
      .then((response) => {
        const resolvedResponse = { statusCode: 200, ...response };
        return this.jsonSuccess(resolvedResponse).then(() =>
          options?.onSuccess?.(resolvedResponse)
        );
      })
      .catch((err) => {
        if (err instanceof Error) {
          return handleError(err, this);
        }
        const resolvedResponse = { statusCode: 400, ...err };
        return this.jsonError(resolvedResponse).then(() =>
          options?.onError?.(resolvedResponse)
        );
      });
  }
}
