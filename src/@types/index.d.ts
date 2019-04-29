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
    }

    https: {
        enabled: boolean;

        port: number;

        enforce: boolean;

        credentials: {key: string; cert: string;} | { pfx: string; passphrase: string}
    }
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
    }

    https?: {
        enabled: boolean;

        port?: number;

        enforce?: boolean;

        credentials?: {key: string; cert: string;} | { pfx: string; passphrase: string}
    }
}

export declare type Method = 'get' | 'post' | 'put' | 'head' | 'options' | 'delete' | 'all';

export declare type Url = string;

export declare type Parameter = string | number | boolean;

export declare type Next = () => void;

export declare type Callback = (request: Request, response: Response,
    ...parameters: Parameter[]) => Promise<boolean>;

export declare type Middleware = (request: Request, response: Response, next: Next,
    ...parameters: Parameter[]) => void;

export declare type ListenerCallback = () => void;


export declare interface CallbackOptions {
    middleware: Middleware | Middleware[];
}

export declare interface MiddlewareOptions {
    method: Method | Method[];
}

export declare interface ResolvedCallbackOptions {
    middleware: Middleware[]
}

export declare interface ResolvedMiddlewareOptions {
    method: Method[]
}

export declare type RouteInstance = [Url, Callback, null | ResolvedCallbackOptions];

export declare type MiddlewareInstance = [Url, Middleware[], null | ResolvedMiddlewareOptions];


export declare interface File {
    name: string;
    tmpName: string;
    path: string;
    size: number;
    type: string;
}

export declare interface FileCollection {
    name: string[];
    tmpName: string[];
    path: string[];
    size: number[];
    type: string[];
}

export declare interface Files {
    [fieldName: string]: File | FileCollection
}

export declare interface Data {
    [propName: string]: string | string[]
}

export declare interface Headers {
    [propName: string]: string;
}

export declare interface Range {
    start: number;
    end: number;
    length: number;
}

export declare interface MultipartHeaders {
    isFile: boolean;
    fileName: string;
    fieldName: string;
    encoding: string;
    type: string
}

export declare interface RouteParameter {
    name: string;
    dataType: string;
    value: string | number | boolean;
}

export declare interface Routes {
    options: RouteInstance[];
    head: RouteInstance[];
    get: RouteInstance[];
    post: RouteInstance[];
    put: RouteInstance[];
    delete: RouteInstance[];
    all: RouteInstance[]
}