import * as fs from 'fs';
import { mkDirSync } from '@teclone/node-utils';
import { EOL } from 'os';
import { ServerRequest } from './Request';
import { ServerResponse } from './Response';

export interface LoggerOpts {
  errorLogFile: string;
  accessLogFile: string;
}

export class Logger {
  private errorLogHandle: number;
  private accessLogHandle: number;

  constructor(opts: LoggerOpts) {
    if (opts.accessLogFile) {
      mkDirSync(opts.accessLogFile);
      this.accessLogHandle = fs.openSync(opts.accessLogFile, 'a');
    }

    if (opts.errorLogFile) {
      mkDirSync(opts.errorLogFile);
      this.errorLogHandle = fs.openSync(opts.errorLogFile, 'a');
    }
  }

  /**
   * log warning message to the console
   */
  warn(message: string): this {
    console.log('\x1b[1m\x1b[33m%s\x1b[0m', message);
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
      if (this.errorLogHandle) {
        fs.writeSync(
          this.errorLogHandle,
          `[${now.toUTCString()}] ${err.stack}${EOL}`
        );
      }
      if (process.env.NODE_ENV !== 'production') {
        console.error(err);
      }
    }
    return this;
  }

  /**
   * logs access information
   */
  private logAccess(req: ServerRequest, res: ServerResponse) {
    if (this.accessLogHandle) {
      const protocol = req.encrypted ? 'Https' : 'Http';
      const startTime = (req.startedAt as Date).toUTCString();

      const log = `[${startTime}] [${req.method}] '${req.url} ${protocol}/${req.httpVersion}' ${res.statusCode}${EOL}`;
      fs.writeSync(this.accessLogHandle, log);
    }
  }

  /**
   * log request response profile
   */
  profile(req: ServerRequest, res: ServerResponse) {
    this.logAccess(req, res);
    if (process.env.NODE_ENV !== 'production') {
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
        req.headers['user-agent'] || 'unknown-ua'
      );
    }
    return this;
  }
}
