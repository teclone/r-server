import { ServerResponse as Http1ServerResponse } from 'http';
import { Http2ServerResponse } from 'http2';
import { isCallable, isString } from '@teclone/utils';
import { Logger } from './Logger';
import { FileServer } from './FileServer';
import { ErrorCallback, RouteResponse } from '../@types';
import { handleError } from './Utils';
import { ServerRequest } from './Request';

export type ServerResponse<
  T extends typeof Http2ServerResponse | typeof Http1ServerResponse =
    | typeof Http2ServerResponse
    | typeof Http1ServerResponse
> = Omit<
  InstanceType<T>,
  'end' | 'setHeader' | 'setHeaders' | 'removeHeader' | 'removeHeaders'
> & {
  prototype: ServerResponse<T>;

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
   * sets response http status code and message if given
   * @param code - the status code
   * @param message - the http status message to given sent
   */
  status(
    this: ServerResponse<T>,
    code: number,
    message?: string
  ): ServerResponse<T>;

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
  jsonError<Data, Errors>(
    this: ServerResponse<T>,
    response?: RouteResponse<Data, Errors>
  ): Promise<boolean>;

  /**
   * sends json success data back to the client
   */
  jsonSuccess<Data, Errors>(
    this: ServerResponse<T>,
    response?: RouteResponse<Data, Errors>
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
  processRouteResponse<Data, Errors>(
    this: ServerResponse<T>,

    /**
     * the response promise
     */
    responsePromise: Promise<RouteResponse<Data, Errors>>
  ): Promise<boolean>;
};

const createResponseClass = <
  T extends typeof Http2ServerResponse | typeof Http1ServerResponse
>(
  BaseResponseClass: T
): T => {
  const ResponseClass = BaseResponseClass as any as ServerResponse<T>;

  const parentEnd = BaseResponseClass.prototype.end;
  const parentSetHeader = BaseResponseClass.prototype.setHeader;
  const parentRemoveHeader = BaseResponseClass.prototype.removeHeader;

  // end
  ResponseClass.prototype.end = function (data, encoding?, cb?) {
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
        parentEnd.call(this, resolvedData, resolvedEncoding, resolvePromise);
      } else {
        parentEnd.call(this, resolvedData, resolvePromise);
      }
    });
  };

  ResponseClass.prototype.setHeader = function (name, value) {
    parentSetHeader.call(this, name, value);
    return this;
  };

  ResponseClass.prototype.setHeaders = function (headers) {
    Object.keys(headers || {}).forEach((key) => {
      this.setHeader(key, headers[key]);
    });
    return this;
  };

  ResponseClass.prototype.removeHeader = function (name) {
    parentRemoveHeader.call(this, name);
    return this;
  };

  ResponseClass.prototype.removeHeaders = function (...names) {
    names.forEach((name) => {
      this.removeHeader(name);
    });
    return this;
  };

  ResponseClass.prototype.status = function (code, message) {
    this.statusCode = code;
    if (message) {
      this.statusMessage = message;
    }
    return this;
  };

  ResponseClass.prototype.redirect = function (path, status = 302) {
    return this.status(status).setHeader('Location', path).end();
  };

  ResponseClass.prototype.download = function (filePath, filename) {
    return this.fileServer.serveDownload(filePath, this, filename);
  };

  ResponseClass.prototype.json = function (data) {
    const resolvedData =
      typeof data === 'string' ? data : JSON.stringify(data || '');
    return this.setHeader('Content-Type', 'application/json').end(resolvedData);
  };

  ResponseClass.prototype.jsonError = function (response) {
    const { headers, message, errors = null, statusCode } = response || {};

    return this.status(statusCode || 400, message)
      .setHeaders(headers)
      .json(errors as any);
  };

  ResponseClass.prototype.jsonSuccess = function (response) {
    const {
      statusCode = 200,
      headers,
      message,
      data = null,
      errors,
    } = response || {};

    if (statusCode >= 300 || errors) {
      return this.jsonError(response);
    }

    return this.status(statusCode, message)
      .setHeaders(headers)
      .json(data as any);
  };

  ResponseClass.prototype.wait = function (time: number) {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(this);
      }, time);
    });
  };

  ResponseClass.prototype.processRouteResponse = function (responsePromise) {
    return responsePromise
      .then((response) => {
        return this.jsonSuccess(response);
      })

      .catch((err) => {
        if (err instanceof Error) {
          return handleError(err, this);
        }
        return this.jsonError(err);
      });
  };

  return ResponseClass as any as T;
};

// HTTP1 Response
class HTTP1BaseResponse extends Http1ServerResponse {
  constructor(req) {
    super(req);
    // @ts-ignore
    this.req = req;
  }
}
export const Http1Response = createResponseClass(HTTP1BaseResponse);

// HTTP2 Response
class HTTP2BaseResponse extends Http2ServerResponse {}
export const Http2Response = createResponseClass(HTTP2BaseResponse);
