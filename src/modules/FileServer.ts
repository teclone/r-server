import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { RServerConfig, Url, Headers, Range, ErrorCallback } from '../@types';
import Request from './Request';
import Response from './Response';
import { isNull, copy, isUndefined, isString, stripSlashes } from '@teclone/utils';
import { IncomingHttpHeaders } from 'http';
import { resolvePaths } from '@teclone/node-utils';
import mime from 'mime-types';
import { ALLOWED_METHODS } from './Constants';
import Logger from './Logger';
import { handleError } from './Utils';

export default class FileServer {
  private config: RServerConfig;

  private logger: Logger;

  private request: Request;

  private response: Response;

  private errorCallback: ErrorCallback | null;

  constructor(
    config: RServerConfig,
    logger: Logger,
    request: Request,
    response: Response,
    errorCallback: ErrorCallback | null,
  ) {
    this.config = config;
    this.logger = logger;
    this.request = request;
    this.response = response;
    this.errorCallback = errorCallback;
  }

  /**
   * ends the response.
   */
  private endResponse(status: number, headers: Headers, data?: any) {
    return this.response
      .status(status)
      .setHeaders(headers)
      .end(data);
  }

  /**
   * ends the streaming response
   */
  private endStream(
    filePath: string,
    status: number,
    headers: Headers,
    options?: object,
  ) {
    const readStream = fs.createReadStream(filePath, options);
    this.response.status(status).setHeaders(headers);

    return new Promise((resolve, reject) => {
      readStream.on('error', err => reject(err));
      readStream.on('end', () => resolve());
      readStream.pipe(this.response as any, { end: false });
    })
      .then(() => this.response.end())
      .catch(err => {
        readStream.close();
        return handleError(
          err,
          this.errorCallback,
          this.logger,
          this.request,
          this.response,
        );
      });
  }

  /**
   * validates range request content.
   * @see https://tools.ietf.org/html/rfc7233
   */
  private validateRangeRequest(
    headers: IncomingHttpHeaders,
    eTag: string,
    fileMTime: string,
    fileSize: number,
  ) {
    const result: {
      isMultiRange: boolean;
      statusCode: number;
      ranges: Range[];
    } = {
      isMultiRange: false,
      statusCode: 206,
      ranges: [],
    };
    const ifRange = headers['if-range'];

    //check if we should send everything
    if (!isUndefined(ifRange) && ifRange !== eTag && ifRange !== fileMTime) {
      result.statusCode = 200;
      result.ranges.push({ start: 0, end: fileSize - 1, length: fileSize });
      return result;
    }

    //we are not sending everything
    const ranges = (headers['range'] as string)
      .replace(/^\s*[^=]*=\s*/, '')
      .split(/,\s*/);
    result.isMultiRange = ranges.length > 0;

    for (const range of ranges) {
      let start = 0;
      let end = fileSize - 1;

      //suffix-byte-range-spec
      if (/^-(\d+)$/.test(range)) {
        const suffixLength = Number.parseInt(RegExp.$1);
        if (suffixLength === 0) {
          continue;
        } else if (suffixLength < fileSize) {
          start = fileSize - suffixLength;
        }
      }
      //byte-range-spec
      else if (/^(\d+)-(\d+)?$/.test(range)) {
        const first = Number.parseInt(RegExp.$1);
        const last = RegExp.$2 ? Number.parseInt(RegExp.$2) : end;

        if (first >= fileSize || last < first) {
          continue;
        } else {
          start = first;
          if (last < end) {
            end = last;
          }
        }
      } else {
        continue;
      }

      result.ranges.push({ start, end, length: end - start + 1 });
    }
    return result;
  }

  /**
   * check if file is not modified
   */
  private fileNotModified(
    headers: IncomingHttpHeaders,
    eTag: string,
    fileMTime: string,
  ): boolean {
    if (!isUndefined(headers['if-none-match']) && headers['if-none-match'] === eTag) {
      return true;
    } else if (
      !isUndefined(headers['if-modified-since']) &&
      headers['if-modified-since'] === fileMTime
    ) {
      return true;
    } else {
      return false;
    }
  }

  /**
   * computes and returns a files eTag
   */
  private computeETag(fileMTime: Date, length: number = 16) {
    const hash = crypto.createHash('sha256');
    hash.update(fileMTime.toString());

    return hash.digest('hex').substring(0, length);
  }

  /**
   * returns default response headers
   */
  private getDefaultHeaders(filePath: string) {
    const stat = fs.statSync(filePath);
    return {
      'Content-Type':
        mime.lookup(path.parse(filePath).ext.substring(1)) || 'application/octet-stream',
      'Last-Modified': stat.mtime.toString(),
      'Content-Length': stat.size.toString(),
      ETag: this.computeETag(stat.mtime),
      'Cache-Control': this.config.cacheControl,
    };
  }

  /**
   * process file
   */
  private process(filePath: string, status: number = 200, headers: Headers = {}) {
    const method = this.request.method;
    if (method === 'options') {
      return this.endResponse(200, {
        Allow: ALLOWED_METHODS.join(','),
      });
    }

    const resHeaders = copy({}, this.getDefaultHeaders(filePath) as Headers, headers);
    if (method === 'head') {
      resHeaders['Accept-Ranges'] = 'bytes';
      return this.endResponse(200, resHeaders);
    }

    const eTag = resHeaders['ETag'];
    const lastModified = resHeaders['Last-Modified'];
    const fileSize = Number.parseInt(resHeaders['Content-Length']);

    //if it is not a range request, negotiate content
    if (isUndefined(this.request.headers['range'])) {
      if (this.fileNotModified(this.request.headers, eTag, lastModified)) {
        return this.endResponse(304, {});
      } else {
        return this.endStream(filePath, 200, resHeaders);
      }
    } else {
      //we are dealing with range request
      const { statusCode, ranges } = this.validateRangeRequest(
        this.request.headers,
        eTag,
        lastModified,
        fileSize,
      );

      //we are sending everything
      if (statusCode === 200) {
        return this.endStream(filePath, 200, resHeaders);
      }

      //range request is not satisfiable
      delete resHeaders['Content-Disposition'];
      if (ranges.length === 0) {
        return this.endResponse(416, {
          'Content-Range': `bytes */${fileSize}`,
        });
      }

      //single range request
      if (ranges.length === 1) {
        const { start, end, length } = ranges[0];
        resHeaders['Content-Length'] = length.toString();
        resHeaders['Content-Range'] = `bytes ${start}-${end}/${fileSize}`;
        return this.endStream(filePath, 206, resHeaders, {
          start,
          end,
        });
      }

      //multi range request. for now, we dont support multipart range. send everything
      resHeaders['Content-Length'] = fileSize.toString();
      resHeaders['Content-Range'] = `bytes ${0}-${fileSize - 1}/${fileSize}`;
      return this.endStream(filePath, 206, resHeaders);
    }
  }

  /**
   * returns the directory's default document if any
   */
  private getDefaultDocument(dir: string): string | null {
    for (const file of this.config.defaultDocuments) {
      if (fs.existsSync(path.join(dir, file))) {
        return file;
      }
    }
    return null;
  }

  /**
   * validates the request method and returns the public file or directory path that
   * matches the request url
   */
  private validateRequest(url: Url, method: string): string | null {
    if (!['head', 'get', 'options'].includes(method)) {
      return null;
    }
    url = url.replace(/[#?].*/, '').replace(/\.\./g, '');

    //bounce back if request url is a hidden resource
    if (!this.config.serveHiddenFiles && /^(\.|.*\/\.)/.test(url)) {
      return null;
    }

    for (const publicPath of this.config.publicPaths) {
      const testPath = path.resolve(this.config.entryPath, publicPath, url);
      if (fs.existsSync(testPath)) {
        if (fs.statSync(testPath).isFile()) {
          return testPath;
        } else {
          //check if there is a default document in the folder
          const defaultDocument = this.getDefaultDocument(testPath);
          if (defaultDocument) {
            return path.join(testPath, defaultDocument);
          }
        }
      }
    }
    return null;
  }

  /**
   * serves a static file response back to the client
   */
  serve(url: Url): Promise<boolean> {
    const filePath = this.validateRequest(stripSlashes(url), this.request.method);
    if (isNull(filePath)) {
      return Promise.resolve(false);
    } else {
      return this.process(filePath);
    }
  }

  /**
   * serves server http error files. such as 504, 404, etc
   */
  serveHttpErrorFile(status: number): Promise<boolean> {
    const httpErrors = this.config.httpErrors;
    let filePath = '';

    if (httpErrors[status]) {
      filePath = resolvePaths(
        this.config.entryPath,
        httpErrors.baseDir,
        httpErrors[status],
      );
    } else {
      filePath = resolvePaths(__dirname, `../httpErrors/${status}.html`);
    }

    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      return this.response.status(status).end();
    } else {
      return this.endStream(filePath, status, this.getDefaultHeaders(filePath));
    }
  }

  /**
   * serves file intended for download to the client
   */
  serveDownload(filePath: string, filename?: string): Promise<boolean> {
    let found = true;
    let absPath = resolvePaths(this.config.entryPath, filePath);

    if (!fs.existsSync(absPath) || fs.statSync(absPath).isDirectory()) {
      found = false;
      for (const current of this.config.publicPaths) {
        absPath = resolvePaths(this.config.entryPath, current, filePath);
        if (fs.existsSync(absPath) && fs.statSync(absPath).isFile()) {
          found = true;
          break;
        }
      }
    }

    if (!found) {
      return Promise.reject(new Error(filePath + ' does not exist'));
    } else {
      filename = isString(filename) ? filename : path.parse(absPath).base;
      return this.process(absPath, 200, {
        'Content-Disposition': `attachment; filename="${filename}"`,
      });
    }
  }
}
