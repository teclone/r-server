import { RServerConfig } from './@types';

export { Server } from './modules/Server';
export { Router } from './modules/Router';

export const createConfig = (config: RServerConfig) => config;
