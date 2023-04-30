import { ServerResponse as Http1ServerResponse } from 'http';
import { Http2ServerResponse } from 'http2';
import { isCallable, isString } from '@teclone/utils';
import { Logger } from './Logger';
import { FileServer } from './FileServer';
import { ErrorCallback } from '../@types';
import { handleError } from './Utils';
import { IncomingHttpHeaders } from 'http';
import { ServerRequest } from './Request';

export interface RouteResponse<ResponseData = {}> {
  status?: 'success' | 'error';
  statusCode?: number;
  message?: string;
  data?: ResponseData;
  headers?: IncomingHttpHeaders;
  ttl?: number;
}

export interface APIExecutor<RequestBody, ResponseData> {
  (arg: {
    body: RequestBody;
    headers: IncomingHttpHeaders;
  }): Promise<RouteResponse<ResponseData> | null>;

  /**
   * assigned name of the handler
   */
  apiName?: string;
}

export type ServerResponse<
  T extends typeof Http2ServerResponse | typeof Http1ServerResponse =
    | typeof Http2ServerResponse
    | typeof Http1ServerResponse
> = Omit<
  InstanceType<T>,
  'end' | 'setHeader' | 'setHeaders' | 'removeHeader' | 'removeHeaders'
> & {
  req: ServerRequest;

  logger: Logger;

  fileServer: FileServer;

  errorCallback: ErrorCallback | null;

  startedAt: Date;

  endedAt: Date;

  end(this: ServerResponse<T>, cb?: () => void): Promise<boolean>;

  end(this: ServerResponse<T>, data?: any, cb?: () => void): Promise<boolean>;

  /**
   * ends the response with optional response data, and optional data encoding
   * @param data optional data to send. either string or buffer
   * @param encoding data encoding if not buffer
   */
  end(
    this: ServerResponse<T>,
    data?: any,
    encoding?: string | (() => void),
    cb?: () => void
  ): Promise<boolean>;

  /**
   * sets response header
   * @param name response header name
   * @param value response header value
   */
  setHeader(
    this: ServerResponse<T>,
    name: string,
    value: string | number | string[]
  ): ServerResponse<T>;

  /**
   * sets multiple response headers
   * @param headers object containing response header name value pairs
   */
  setHeaders(
    this: ServerResponse<T>,
    headers: {
      [p: string]: string | number | string[];
    }
  ): ServerResponse<T>;

  /**
   * removes a single set response header at a time. function is chainable
   * @param name response header to remove
   */
  removeHeader(this: ServerResponse<T>, name: string): ServerResponse<T>;

  /**
   * remove response headers that are already set. function is chainable
   * @param names - comma separated list of header names to remove
   */
  removeHeaders(this: ServerResponse<T>, ...names: string[]): ServerResponse<T>;

  /**
   * sets response status code
   * @param code - the response code
   */
  status(this: ServerResponse<T>, code: number): ServerResponse<T>;

  /**
   * sends json response back to the client.
   * @param data - the json string or json object which will be stringified
   */
  json(this: ServerResponse<T>, data?: object | string): Promise<boolean>;

  /**
   * Redirect client to the given url
   */
  redirect(
    this: ServerResponse<T>,
    path: string,
    status?: number
  ): Promise<boolean>;
  /**
   * sends a file download attachment to the client
   * @param filePath - relative or absolute file path
   * @param filename - suggested file download name
   */
  download(
    this: ServerResponse<T>,
    filePath: string,
    filename?: string
  ): Promise<boolean>;

  /**
   * sends json error data back to the client
   */
  jsonError(
    this: ServerResponse<T>,
    response?: RouteResponse
  ): Promise<boolean>;

  /**
   * sends json success data back to the client
   */
  jsonSuccess(
    this: ServerResponse<T>,
    response?: RouteResponse
  ): Promise<boolean>;

  /**
   * waits for the given time
   */
  wait(this: ServerResponse<T>, time: number): Promise<ServerResponse<T>>;

  /**
   * it process a json api response, automatically handling
   * the then and catch responses,
   * @param response
   * @returns
   */
  processRouteResponse<DataType>(
    this: ServerResponse<T>,
    responsePromise: Promise<RouteResponse<DataType>>,
    options?: {
      onSuccess?: (response: RouteResponse<DataType>) => any;
      onError?: (response: RouteResponse<DataType>) => any;
    }
  ): Promise<boolean>;
};

type ServerResponseConstructor<
  T extends typeof Http2ServerResponse | typeof Http1ServerResponse
> = Omit<T, 'prototype'> & {
  new (streamOrRequest: ConstructorParameters<T>[0]): ServerResponse<T>;

  prototype: ServerResponse<T>;
};

const createResponseClass = <
  T extends typeof Http2ServerResponse | typeof Http1ServerResponse
>(
  BaseResponseClass: T,
  opts: {
    construct?: (
      this: ServerResponse<T>,
      streamOrRequest: ConstructorParameters<T>[0]
    ) => void;
  }
) => {
  const { construct } = opts;

  const newClass: ServerResponseConstructor<T> = function _constructor(
    this: ServerResponse<T>,
    streamOrRequest
  ) {
    BaseResponseClass.call(this, streamOrRequest);
    if (construct) {
      construct.call(this, streamOrRequest);
    }
  } as unknown as ServerResponseConstructor<T>;

  Object.setPrototypeOf(newClass.prototype, BaseResponseClass.prototype);

  // end
  newClass.prototype.end = function (data, encoding?, cb?) {
    let resolvedData: string | Buffer | Uint8Array = '';
    let resolvedEncoding: BufferEncoding | string;

    let resolvedCb = null;

    // first implementation
    if (isCallable(data)) {
      resolvedCb = data;
    } else {
      resolvedData = data;
    }

    if (typeof encoding === 'string') {
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

    return new Promise<boolean>((resolve) => {
      const resolvePromise = () => {
        resolve(true);
        if (resolvedCb) {
          resolvedCb();
        }
      };

      if (encoding) {
        BaseResponseClass.prototype.end.call(
          this,
          resolvedData,
          resolvedEncoding,
          resolvePromise
        );
      } else {
        BaseResponseClass.prototype.end.call(
          this,
          resolvedData,
          resolvePromise
        );
      }
    });
  };

  newClass.prototype.setHeader = function (name, value) {
    BaseResponseClass.prototype.setHeader.call(this, name, value);
    return this;
  };

  newClass.prototype.setHeaders = function (headers) {
    Object.keys(headers || {}).forEach((key) => {
      this.setHeader(key, headers[key]);
    });
    return this;
  };

  newClass.prototype.removeHeader = function (name) {
    BaseResponseClass.prototype.removeHeader.call(this, name);
    return this;
  };

  newClass.prototype.removeHeaders = function (...names: string[]) {
    names.forEach((name) => {
      this.removeHeader(name);
    });
    return this;
  };

  newClass.prototype.status = function (code: number) {
    this.statusCode = code;
    return this;
  };

  newClass.prototype.json = function (
    data?: object | string
  ): Promise<boolean> {
    if (!isString(data)) {
      data = JSON.stringify(data || '');
    }
    return this.setHeader('Content-Type', 'application/json').end(data);
  };

  newClass.prototype.redirect = function (
    path: string,
    status = 302
  ): Promise<boolean> {
    return this.status(status).setHeader('Location', path).end();
  };

  newClass.prototype.download = function (
    filePath: string,
    filename?: string
  ): Promise<boolean> {
    return this.fileServer.serveDownload(filePath, this, filename);
  };

  newClass.prototype.jsonError = function (
    response?: RouteResponse
  ): Promise<boolean> {
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
  };

  newClass.prototype.jsonSuccess = function (
    response?: RouteResponse
  ): Promise<boolean> {
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
  };

  newClass.prototype.wait = function (time: number) {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(this);
      }, time);
    });
  };

  newClass.prototype.processRouteResponse = function (
    responsePromise,
    options
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
  };

  return newClass;
};

export const Http1Response = createResponseClass(Http1ServerResponse, {
  construct(req) {
    this.req = req as any;
  },
});

export const Http2Response = createResponseClass(Http2ServerResponse, {});
