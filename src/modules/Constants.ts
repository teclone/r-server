import { Method, Routes } from '../@types';

// this matches a route token path in the form of {dataType:pathParameterName} or {pathParameterName}
const singleToken = '\\{((?:[a-z]+:)?[a-z]+)\\}';

// single token regex
export const SINGLE_TOKEN_REGEX = new RegExp(singleToken, 'i');

// double token regex, helps capture routh tokens that targets two pairs of from and to values
// eg {dataType:fromPathParameterName}-{dataType:toPathParameterName}
// or {dataType:fromPathParameterName}.{dataType:toPathParameterName}
export const DOUBLE_TOKEN_REGEX = new RegExp(
  singleToken + '([-.])' + singleToken,
  'i'
);

export const ERROR_LEVELS = {
  WARNING: 'WARNING',
  FATAL: 'FATAL',
};

export const ALLOWED_METHODS = ['OPTIONS', 'HEAD', 'GET', 'POST', 'PUT'];

export const CRLF = '\r\n';

export const BLANK_LINE = CRLF + CRLF;

let routeId = 0;
let middlewareId = 0;

export const assignRouteId = () => ++routeId;

export const assignMiddlewareId = () => ++middlewareId;

export const ALL_METHODS: Method[] = [
  'options',
  'head',
  'get',
  'post',
  'put',
  'delete',
];

export const DEFAULT_CONFIG_FILE = '.server.config.js';
