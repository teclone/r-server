import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import type { RServerConfig, Headers, Range } from '../@types';

import { isUndefined, isString, stripSlashes } from '@teclone/utils';
import { IncomingHttpHeaders } from 'http';
import mime from 'mime-types';
import { ALLOWED_METHODS } from './Constants';
import { handleError } from './Utils';
import { resolve } from 'path';
import { ServerResponse } from './Response';

export class FileServer {
  private config: RServerConfig;
  private rootDir: string;

  constructor(rootDir: string, config: RServerConfig) {
    this.rootDir = rootDir;
    this.config = config;
  }

  /**
   * streams a file to client
   */
  private streamFile(
    filePath: string,
    response: ServerResponse,
    status: number,
    headers: Headers,
    options?: object
  ) {
    const readStream = fs.createReadStream(filePath, options);
    response.status(status).setHeaders(headers);

    return new Promise((resolve, reject) => {
      readStream.on('error', (err) => reject(err));
      readStream.on('end', () => resolve(true));
      readStream.pipe(response as any, { end: false });
    })
      .then(() => response.end())
      .catch((err) => {
        readStream.close();
        return handleError(err, response);
      });
  }

  /**
   * validates range request content.
   * @see https://tools.ietf.org/html/rfc7233
   */
  private validateRangeRequest(
    headers: IncomingHttpHeaders,
    eTag: string,
    lastModified: Date,
    fileSize: number
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
    if (ifRange && ifRange !== eTag) {
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
   * check if file is  modified
   */
  private doesClientNeedContent(
    headers: IncomingHttpHeaders,
    contentTag: string,
    contentLastModified: Date
  ): boolean {
    if (!contentTag && !contentLastModified) {
      return true;
    }

    if (
      !headers['if-none-match'] &&
      !headers['if-match'] &&
      !headers['if-modified-since'] &&
      !headers['if-unmodified-since']
    ) {
      return true;
    }

    // check if match conditions
    if (headers['if-match']) {
      return contentTag === headers['if-match'];
    }

    if (headers['if-none-match']) {
      return contentTag !== headers['if-none-match'];
    }

    if (headers['if-modified-since']) {
      return (
        !contentLastModified ||
        contentLastModified > new Date(headers['if-modified-since'])
      );
    }

    if (headers['if-unmodified-since']) {
      return (
        !contentLastModified ||
        contentLastModified <= new Date(headers['if-unmodified-since'])
      );
    }

    return true;
  }

  /**
   * computes and returns a files eTag
   */
  private computeETag(fileMTime: Date, length = 16) {
    const hash = crypto.createHash('sha256');
    hash.update(fileMTime.toString());

    return hash.digest('hex').substring(0, length);
  }

  /**
   * returns default response headers
   */
  private getFileDefaultHeaders(filePath: string) {
    const stat = fs.statSync(filePath);
    const eTag = this.computeETag(stat.mtime);

    const lastModified = stat.mtime;

    // it is important to remove milliseconds
    // to match date time format of last-modified header
    lastModified.setUTCMilliseconds(0);

    return {
      lastModified,
      eTag,
      fileSize: stat.size,
      headers: {
        'Content-Type':
          mime.lookup(path.parse(filePath).ext.substring(1)) ||
          'application/octet-stream',
        'Last-Modified': lastModified.toUTCString(),
        'Content-Length': stat.size.toString(),
        ETag: eTag,
        'Cache-Control': this.config.cacheControl,
      },
    };
  }

  /**
   * process file
   */
  private process(
    filePath: string,
    requestMethod: string,
    requestHeaders: IncomingHttpHeaders,
    response: ServerResponse
  ) {
    requestMethod = requestMethod.toLowerCase();
    if (requestMethod === 'options') {
      return response
        .status(200)
        .setHeaders({
          Allow: ALLOWED_METHODS.join(','),
        })
        .end();
    }

    const {
      headers: resHeaders,
      eTag,
      lastModified,
      fileSize,
    } = this.getFileDefaultHeaders(filePath);

    if (requestMethod === 'head') {
      resHeaders['Accept-Ranges'] = 'bytes';
      return response.status(200).setHeaders(resHeaders).end();
    }

    //if it is not a range request, negotiate content
    if (isUndefined(requestHeaders['range'])) {
      if (!this.doesClientNeedContent(requestHeaders, eTag, lastModified)) {
        return response.status(304).end();
      } else {
        return this.streamFile(filePath, response, 200, resHeaders);
      }
    } else {
      //we are dealing with range request
      const { statusCode, ranges } = this.validateRangeRequest(
        requestHeaders,
        eTag,
        lastModified,
        fileSize
      );

      //we are sending everything
      if (statusCode === 200) {
        return this.streamFile(filePath, response, 200, resHeaders);
      }

      delete resHeaders['Content-Disposition'];

      //range request is not satisfiable
      if (ranges.length === 0) {
        return response
          .status(416)
          .setHeaders({
            'Content-Range': `bytes */${fileSize}`,
          })
          .end();
      }

      //single range request
      if (ranges.length === 1) {
        const { start, end, length } = ranges[0];
        resHeaders['Content-Length'] = length.toString();
        resHeaders['Content-Range'] = `bytes ${start}-${end}/${fileSize}`;
        return this.streamFile(filePath, response, 206, resHeaders, {
          start,
          end,
        });
      }

      //multi range request. for now, we dont support multipart range. send everything
      resHeaders['Content-Length'] = fileSize.toString();
      resHeaders['Content-Range'] = `bytes ${0}-${fileSize - 1}/${fileSize}`;

      return this.streamFile(filePath, response, 206, resHeaders);
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
  private validateRequest(url: string, method: string): string | null {
    if (!['head', 'get', 'options'].includes(method.toLowerCase())) {
      return null;
    }

    url = url.replace(/[#?].*/, '').replace(/\.\./g, '');

    for (const publicPath of this.config.publicPaths) {
      const testPath = path.resolve(this.rootDir, publicPath, url);
      if (fs.existsSync(testPath)) {
        const stat = fs.statSync(testPath);
        if (stat.isFile()) {
          return testPath;
        } else if (stat.isDirectory()) {
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
  serve(
    requestPath: string,
    requestMethod: string,
    requestHeaders: IncomingHttpHeaders,
    response: ServerResponse
  ): Promise<boolean> {
    requestMethod = requestMethod.toLowerCase();
    const filePath = this.validateRequest(
      stripSlashes(requestPath),
      requestMethod
    );
    if (filePath) {
      return this.process(filePath, requestMethod, requestHeaders, response);
    }

    return Promise.resolve(false);
  }

  /**
   * serves server http error files. such as 504, 404, etc
   */
  serveHttpErrorFile(
    errorStatusCode: number,
    response: ServerResponse
  ): Promise<boolean> {
    const httpErrors = this.config.httpErrors;
    let filePath = '';

    const errorStatusCodeStr = errorStatusCode.toString();

    if (httpErrors[errorStatusCodeStr]) {
      filePath = resolve(
        this.rootDir,
        httpErrors.baseDir,
        httpErrors[errorStatusCode]
      );
    } else {
      filePath = resolve(__dirname, `../httpErrors/${errorStatusCode}.html`);
    }

    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      return response.status(errorStatusCode).end();
    } else {
      return this.streamFile(
        filePath,
        response,
        errorStatusCode,
        this.getFileDefaultHeaders(filePath).headers
      );
    }
  }

  /**
   * serves file intended for download to the client
   */
  serveDownload(
    filePath: string,
    response: ServerResponse,
    filename?: string
  ): Promise<boolean> {
    let found = true;
    let absPath = resolve(this.rootDir, filePath);

    if (!fs.existsSync(absPath) || fs.statSync(absPath).isDirectory()) {
      found = false;
      for (const current of this.config.publicPaths) {
        absPath = resolve(this.rootDir, current, filePath);
        if (fs.existsSync(absPath) && fs.statSync(absPath).isFile()) {
          found = true;
          break;
        }
      }
    }

    if (!found) {
      return Promise.reject(
        new Error(`Could not locate download file at ${filePath}`)
      );
    } else {
      filename = isString(filename) ? filename : path.parse(absPath).base;
      return this.streamFile(absPath, response, 200, {
        'Content-Disposition': `attachment; filename="${filename}"`,
      });
    }
  }
}
