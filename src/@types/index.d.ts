import { AddressInfo } from 'net';
import Request from '../modules/Request';
import Response from '../modules/Response';

export interface RServerConfig {
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

    credentials:
      | { key: string; cert: string }
      | { pfx: string; passphrase: string };
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
  | 'all';

export type Url = string;

export type Parameter = string | number | boolean;

export type Next = () => void;

export type Callback = <
  Req extends Request = Request,
  Res extends Response = Response
>(
  request: Req,
  response: Res,
  ...parameters: Parameter[]
) => Promise<boolean>;

export type Middleware = <
  Req extends Request = Request,
  Res extends Response = Response
>(
  request: Req,
  response: Res,
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

export type RouteInstance = [Url, Callback, null | ResolvedCallbackOptions];

export type MiddlewareInstance = [
  Url,
  Middleware[],
  null | ResolvedMiddlewareOptions
];

export interface File {
  name: string;
  tmpName: string;
  path: string;
  size: number;
  type: string;
}

export interface FileCollection {
  name: string[];
  tmpName: string[];
  path: string[];
  size: number[];
  type: string[];
}

export interface Files {
  [fieldName: string]: File | FileCollection;
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
