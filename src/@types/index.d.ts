import { AddressInfo } from 'net';
import Request from '../modules/Request';
import Response from '../modules/Response';

export interface RServerConfig {
  entryPath: string;

  env: 'dev' | 'prod';

  errorLog: string;

  accessLog: string;

  profileRequest: boolean;

  tempDir: string;

  publicPaths: string[];

  serveHiddenFiles: boolean;

  cacheControl: string;

  encoding: string;

  maxMemory: string | number;

  defaultDocuments: string[];

  httpErrors: {
    baseDir: string;

    404: string;

    500: string;
  };

  https: {
    enabled: boolean;

    port: number;

    enforce: boolean;

    credentials: { key: string; cert: string } | { pfx: string; passphrase: string };
  };
}

export interface Config {
  env?: 'dev' | 'prod';

  errorLog?: string;

  accessLog?: string;

  profileRequest?: boolean;

  tempDir?: string;

  publicPaths?: string[];

  serveHiddenFiles?: boolean;

  cacheControl?: string;

  encoding?: string;

  maxMemory?: string | number;

  defaultDocuments?: string[];

  httpErrors?: {
    baseDir?: string;

    404: string;

    500?: string;
  };

  https?: {
    enabled: boolean;

    port?: number;

    enforce?: boolean;

    credentials?: { key: string; cert: string } | { pfx: string; passphrase: string };
  };
}

export type Method = 'get' | 'post' | 'put' | 'head' | 'options' | 'delete' | 'all';

export type Url = string;

export type RouteId = number;

export type MiddlewareId = number;

export type Parameter = string | number | boolean;

export type Next = () => void;

export type Callback<Rq extends Request = Request, Rs extends Response = Response> = (
  request: Rq,
  response: Rs,
  ...parameters: Parameter[]
) => Promise<boolean>;

export type ErrorCallback<Rq extends Request = Request, Rs extends Response = Response> = (
  err: Error,
  request: Rq,
  response: Rs,
  code?: number
) => Promise<boolean>;

export type Middleware<Rq extends Request = Request, Rs extends Response = Response> = (
  request: Rq,
  response: Rs,
  next: Next,
  ...parameters: Parameter[]
) => void;

export type ListenerCallback = () => void;

export interface CallbackOptions {
  middleware: Middleware | Middleware[];
}

export interface MiddlewareOptions {
  method: Method | Method[];
}

export interface ResolvedCallbackOptions {
  middleware: Middleware[];
}

export interface ResolvedMiddlewareOptions {
  method: Method[];
}

export type RouteInstance = [RouteId, Url, Callback, null | ResolvedCallbackOptions];

export type MiddlewareInstance = [MiddlewareId, Url, Middleware[], null | ResolvedMiddlewareOptions];

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

export interface Routes {
  options: RouteInstance[];
  head: RouteInstance[];
  get: RouteInstance[];
  post: RouteInstance[];
  put: RouteInstance[];
  delete: RouteInstance[];
  all: RouteInstance[];
}
