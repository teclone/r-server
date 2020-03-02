import { ServerResponse } from 'http';
import { isString } from '@teclone/utils';
import FileServer from './FileServer';
import Request from './Request';
import { ErrorCallback, RServerConfig } from '../@types';
import Logger from './Logger';

export default class Response extends ServerResponse {
  config: RServerConfig = {} as RServerConfig;

  request: Request = {} as Request;

  logger: Logger = {} as Logger;

  errorCallback: ErrorCallback | null = null;

  startedAt: Date = {} as Date;

  endedAt: Date = {} as Date;

  constructor(req: Request) {
    super(req);
    this.request = req;
  }

  end(cb?: () => void): Promise<boolean>;

  end(data?: any, encoding?: string): Promise<boolean>;

  /**
   * ends the response with optional response data, and optional data encoding
   * @param data optional data to send. either string or buffer
   * @param encoding data encoding if not buffer
   */
  end(data?, encoding?: string): Promise<boolean> {
    return new Promise(resolve => {
      if (encoding) {
        super.end(data, encoding, () => {
          resolve(true);
        });
      } else {
        super.end(data, () => {
          resolve(true);
        });
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
    Object.keys(headers).forEach(key => {
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
    names.forEach(name => {
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
  json(data: object | string): Promise<boolean> {
    if (!isString(data)) {
      data = JSON.stringify(data);
    }
    return this.setHeader('Content-Type', 'application/json').end(data);
  }

  /**
   * Redirect client to the given url
   */
  redirect(path: string, status: number = 302): Promise<boolean> {
    return this.status(status)
      .setHeader('Location', path)
      .end();
  }

  /**
   * sends a file download attachment to the client
   * @param filePath - relative or absolute file path
   * @param filename - suggested file download name
   */
  download(filePath: string, filename?: string): Promise<boolean> {
    const fileServer = new FileServer(
      this.config,
      this.logger,
      this.request,
      this,
      this.errorCallback,
    );
    return fileServer.serveDownload(filePath, filename);
  }

  /**
   * sends json error data back to the client
   * @param statusCode http error status code, defaults to 400
   * @param message short message to return to client
   * @param errorData error data object, defaults to empty object
   */
  jsonError(
    statusCode: number = 400,
    message: string = 'request failed',
    errors: object = {},
  ): Promise<boolean> {
    return this.status(statusCode).json({
      status: 'error',
      code: statusCode,
      message,
      errors,
    });
  }

  /**
   * sends json success data back to the client
   * @param statusCode http status code, defaults to 200
   * @param message short message to return to client
   * @param successData success data object, default to empty object
   */
  jsonSuccess(
    statusCode: number = 200,
    message: string = 'request successful',
    data: object = {},
  ): Promise<boolean> {
    return this.status(statusCode).json({
      status: 'success',
      code: statusCode,
      message,
      data,
    });
  }

  /**
   * waits for the given time
   */
  wait(time: number): Promise<Response> {
    return new Promise(resolve => {
      setTimeout(() => {
        resolve(this);
      }, time);
    });
  }
}
