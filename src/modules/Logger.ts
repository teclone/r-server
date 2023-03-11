import type { Response } from './Response';
import * as fs from 'fs';
import { RServerConfig } from '../@types';
import { mkDirSync } from '@teclone/node-utils';
import type { Request } from './Request';
import { EOL } from 'os';
import { resolve } from 'path';

export class Logger {
  private config: RServerConfig;

  private errorLogHandle: number;

  private accessLogHandle: number;

  constructor(config: RServerConfig) {
    this.config = config;

    const errorLogPath = resolve(this.config.entryPath, this.config.errorLog);
    const accessLogPath = resolve(this.config.entryPath, this.config.accessLog);

    mkDirSync(errorLogPath);
    mkDirSync(accessLogPath);

    this.errorLogHandle = fs.openSync(
      resolve(this.config.entryPath, this.config.errorLog),
      'a'
    );
    this.accessLogHandle = fs.openSync(
      resolve(this.config.entryPath, this.config.accessLog),
      'a'
    );
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
  logError(err: Error) {
    if (err instanceof Error) {
      const now = new Date();
      fs.writeSync(
        this.errorLogHandle,
        `[${now.toUTCString()}] ${err.stack}${EOL}`
      );
      if (this.config.env !== 'production') {
        console.error(err);
      }
    }
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
    if (this.config.env === 'development' && this.config.profileRequests) {
      const requestTime =
        (req.endedAt as Date).getTime() - (req.startedAt as Date).getTime();
      const responseTime =
        (res.endedAt as Date).getTime() - (res.startedAt as Date).getTime();

      const template =
        res.statusCode >= 400
          ? '%s: %s \x1b[31m%d\x1b[0m ~%dms ~%dms\x1b[0m %s'
          : '%s: %s \x1b[32m%d\x1b[0m ~%dms ~%dms\x1b[0m %s';

      console.log(
        template,
        req.method,
        req.url,
        res.statusCode,
        requestTime,
        responseTime,
        req.headers['user-agent']
      );
    }
    return this;
  }
}
