import { RServerConfig } from './@types';

export { Server } from './modules/Server';
export { Router } from './modules/Router';
export { BodyParser } from './modules/BodyParser';

export { Http1Request, Http2Request } from './modules/Request';
export { Http1Response, Http2Response } from './modules/Response';

export * from './@types';

export const createConfig = (config: RServerConfig) => config;
