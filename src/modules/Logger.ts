import { ERROR_LEVELS } from './Constants';
import Response from './Response';
import * as fs from 'fs';
import { RServerConfig } from '../@types';
import { resolvePaths, mkDirSync } from '@forensic-js/node-utils';
import Request from './Request';
import { EOL } from 'os';

export default class Logger {
  private config: RServerConfig;

  private errorLogHandle: number;

  private accessLogHandle: number;

  constructor(entryPath: string, config: RServerConfig) {
    this.config = config;

    const errorLogPath = resolvePaths(entryPath, this.config.errorLog);
    const accessLogPath = resolvePaths(entryPath, this.config.accessLog);

    mkDirSync(errorLogPath);
    mkDirSync(accessLogPath);

    this.errorLogHandle = fs.openSync(
      resolvePaths(entryPath, this.config.errorLog),
      'a'
    );
    this.accessLogHandle = fs.openSync(
      resolvePaths(entryPath, this.config.accessLog),
      'a'
    );
  }

  /**
   * close the handles once the server is closed
   */
  close(): this {
    fs.closeSync(this.errorLogHandle);
    fs.closeSync(this.accessLogHandle);
    return this;
  }

  /**
   * runs the error logging
   */
  logError(level: string, err: Error) {
    const now = new Date();
    fs.writeSync(
      this.errorLogHandle,
      `[${now.toUTCString()}] [${level}] ${err.toString()}${EOL}`
    );
    return this;
  }

  /**
   * logs access information
   */
  private logAccess(req: Request, res: Response) {
    const protocol = req.encrypted ? 'Https' : 'Http';
    const startTime = (req.startedAt as Date).toUTCString();

    const log = `[${startTime}] [${req.method}] '${req.url} ${protocol}/${req.httpVersion}' ${res.statusCode}${EOL}`;
    fs.writeSync(this.accessLogHandle, log);
  }

  /**
   * log request response profile
   */
  profile(req: Request, res: Response) {
    this.logAccess(req, res);
    if (this.config.env === 'dev' && this.config.profileRequest) {
      const requestTime =
        (req.endedAt as Date).getTime() - (req.startedAt as Date).getTime();
      const responseTime =
        (res.endedAt as Date).getTime() - (res.startedAt as Date).getTime();

      const template =
        res.statusCode >= 400
          ? '%s: %s \x1b[31m%d\x1b[0m ~%dms ~%dms\x1b[0m'
          : '%s: %s \x1b[32m%d\x1b[0m ~%dms ~%dms\x1b[0m';

      console.log(
        template,
        req.method,
        req.url,
        res.statusCode,
        requestTime,
        responseTime
      );
    }
    return this;
  }

  /**
   * logs fatal error to error log file and ends the response
   */
  fatal(err: Error, response: Response) {
    this.logError(ERROR_LEVELS.FATAL, err);

    const statusCode = this.config.env === 'prod' ? 500 : 200;
    const data = this.config.env === 'prod' ? undefined : err.toString();

    /* istanbul ignore else */
    if (!response.finished) {
      return response
        .status(statusCode)
        .removeHeaders('Content-Length')
        .end(data);
    } else {
      return Promise.resolve(false);
    }
  }

  /**
   * log warning message to the console
   */
  warn(message: string): this {
    console.log('\x1b[1m\x1b[31m%s\x1b[0m', message);
    return this;
  }

  /**
   * log info message to the console
   */
  info(message: string): this {
    console.log('\x1b[1m\x1b[32m%s\x1b[0m', message);
    return this;
  }
}
