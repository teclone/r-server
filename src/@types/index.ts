import { IncomingHttpHeaders } from 'http';
import { ServerRequest } from '../modules/Request';
import { ServerResponse } from '../modules/Response';

export type Env = 'development' | 'production' | 'test';

export type HttpsVersion = '1' | '2';

export type HttpProtocol = 'http' | 'https';

export interface ObjectOfAny {
  [p: string]: any;
}

export interface RServerConfig {
  /**
   * http port to start server. can be overriden with process.env.PORT
   */
  port?: number;

  /**
   * path to error log file, defaults to ./logs/error.log
   */
  errorLog?: string;

  /**
   * path to access log file, defaults to ./logs/access.log
   */
  accessLog?: string;

  /**
   * path to temporary directory where uploaded files are stored. defaults to ./tmp
   */
  tempDir?: string;

  /**
   * public paths, where files should be served. defaults to ./public
   */
  publicPaths?: string[];

  cacheControl?: string;

  encoding?: BufferEncoding;

  maxMemory?: string | number;

  defaultDocuments?: string[];

  httpErrors?: {
    baseDir?: string;

    404: string;

    500?: string;
  };

  /**
   * secure http settings
   */
  https?: {
    enabled: boolean;

    /**
     * the https version to use, by default, it is http2,
     *
     * http2 provides https 1.0 fallback, but if you specifically do not
     * want http2 support, set the version to 1
     */
    version?: HttpsVersion;

    port?: number;

    /**
     * if enforce is true, http 1.0 endpoint will redirect to the https endpoint
     */
    enforce?: boolean;

    credentials?:
      | { key: string; cert: string }
      | { pfx: string; passphrase: string };
  };
}

export type Method =
  | 'get'
  | 'post'
  | 'put'
  | 'head'
  | 'options'
  | 'delete'
  | '*';

export type Path = string;

export type RouteId = number;

export type MiddlewareId = number;

export type Parameter = string | number | boolean;

export interface Next {
  (): true;
  reset: () => void;
  status: () => boolean;
}

export type Callback<
  Rq extends ServerRequest = ServerRequest,
  Rs extends ServerResponse = ServerResponse
> = (
  request: Rq,
  response: Rs,
  options: { pathParams: PathParameters }
) => Promise<boolean>;

export type ErrorCallback<
  Rq extends ServerRequest = ServerRequest,
  Rs extends ServerResponse = ServerResponse
> = (
  err: Error,
  request: Rq,
  response: Rs,
  statusCode?: number
) => Promise<boolean>;

export type Middleware<
  Rq extends ServerRequest = ServerRequest,
  Rs extends ServerResponse = ServerResponse
> = (
  request: Rq,
  response: Rs,
  next: Next,
  options: { pathParams: PathParameters }
) => Promise<boolean> | boolean;

export type ListenerCallback = () => void;

export type RouteInstance = [RouteId, Path, Callback, Middleware[]];

export type MiddlewareInstance = [
  MiddlewareId,
  Path,
  Middleware[],
  Set<Method>
];

export interface FileEntry {
  /**
   * file name in user machine as it was uploaded
   */
  name: string;

  /**
   * generated file name used in storing the file
   */
  key: string;

  /**
   * file absolute path in storage
   */
  path: string;

  /**
   * file size in bytes
   */
  size: number;

  /**
   * file mime type as supplied by the client
   */
  type: string;
}

export interface FileEntryCollection {
  /**
   * file names in user machine as it was uploaded
   */
  name: string[];

  /**
   * generated file names used in storing the file
   */
  key: string[];

  /**
   * file absolute paths in storage
   */
  path: string[];

  /**
   * file sizes in bytes
   */
  size: number[];

  /**
   * file mimes type as supplied by the client
   */
  type: string[];
}

export interface Files {
  [fieldName: string]: FileEntry | FileEntryCollection;
}

export interface Data {
  [propName: string]: string | string[];
}

export type PathParameters<T extends string = string> = Record<
  T,
  string | number | boolean
>;

export interface Headers {
  [propName: string]: string;
}

export interface Range {
  start: number;
  end: number;
  length: number;
}

export interface MultipartHeaders {
  isFile: boolean;
  fileName: string;
  fieldName: string;
  encoding: string;
  type: string;
}

export interface RouteParameter {
  name: string;
  dataType: string;
  value: string | number | boolean;
}

export type Routes = Record<Exclude<Method, '*'>, RouteInstance[]>;

export interface RouteResponse<Data = {}, Errors = {}> {
  statusCode?: number;
  message?: string;
  data?: Data;
  errors?: Errors;
  headers?: IncomingHttpHeaders;
}

export interface APIExecutor<RequestBody, ResponseData> {
  (arg: {
    /**
     * request body, should be a combination of parsed post body and url search params
     */
    body: RequestBody;

    /**
     * request http headers
     */
    headers: IncomingHttpHeaders;

    /**
     * request path parameters, as contained in the routing path
     */
    pathParams: PathParameters;
  }): Promise<RouteResponse<ResponseData> | null>;

  /**
   * assigned name of the handler
   */
  apiName?: string;
}
