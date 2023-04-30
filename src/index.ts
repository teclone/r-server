import { RServerConfig } from './@types';

export { Server } from './modules/Server';
export { Router } from './modules/Router';

export { Http1Request, Http2Request } from './modules/Request';
export { Http1Response, Http2Response } from './modules/Response';

export const createConfig = (config: RServerConfig) => config;
