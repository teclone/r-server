import { mkDirSync } from '@teclone/node-utils';
import * as fs from 'fs';
import {
  Data,
  Files,
  MultipartHeaders,
  FileEntry,
  FileEntryCollection,
} from '../@types/index';
import {
  isArray,
  isNull,
  generateRandomText,
  isObject,
  makeArray,
} from '@teclone/utils';
import { CRLF, BLANK_LINE } from './Constants';
import { v1 as uuidv1 } from 'uuid';
import { resolve } from 'path';

export interface BodyParserConstructOpts {
  tempDir: string;
  encoding: BufferEncoding;
}

export class BodyParser {
  private tempDir: string;
  private encoding: BufferEncoding;

  constructor(opts: BodyParserConstructOpts) {
    this.tempDir = opts.tempDir;
    this.encoding = opts.encoding;

    //create file storage dir
    mkDirSync(opts.tempDir);
  }

  /**
   * resolves the field name by removing trailing bracket
   */
  private resolveFieldName(fieldName: string) {
    if (/^(.+)\[\]$/.test(fieldName)) {
      return { name: RegExp.$1, isMultiValue: true };
    } else {
      return { name: fieldName, isMultiValue: false };
    }
  }

  /**
   * assigns a single field or multi value field value to the body
   */
  private assignBodyValue(body: Data, fieldName: string, value: string) {
    const { name, isMultiValue } = this.resolveFieldName(fieldName);

    let target: string | string[] = value;
    if (isMultiValue) {
      const previous = body[name];
      target = isArray(previous) ? previous : [];
      target.push(value);
    }
    body[name] = target;
  }

  /**
   * stores a file into the given files object
   */
  private assignFileValue(files: Files, fieldName: string, value: FileEntry) {
    const { name, isMultiValue } = this.resolveFieldName(fieldName);

    let target: FileEntry | FileEntryCollection = value;
    if (isMultiValue) {
      const previous = files[name];
      target = isObject<FileEntryCollection>(previous)
        ? previous
        : {
            path: [],
            key: [],
            size: [],
            type: [],
            name: [],
          };

      Object.keys(value).forEach((key) => {
        target[key].push(value[key]);
      });
    }
    files[name] = target;
  }

  /**
   * processes and stores file
   */
  private processFile(headers: MultipartHeaders, content: string): FileEntry {
    const key = uuidv1() + '.tmp';
    const filePath = resolve(this.tempDir, key);

    fs.writeFileSync(filePath, content, {
      encoding: headers.encoding as BufferEncoding,
    });

    return {
      name: headers.fileName.replace(/\.\./g, ''),
      key,
      path: filePath,
      size: fs.statSync(filePath).size,
      type: headers.type,
    };
  }

  /**
   * parses a multipart part headers.
   */
  private parseHeaders(headers: string[]): MultipartHeaders {
    //assume a default value if there are no headers sent
    const result: MultipartHeaders = {
      isFile: false,
      type: 'text/plain',
      fileName: '',
      fieldName: generateRandomText(8),
      encoding: this.encoding,
    };

    for (let i = 0; i < headers.length; i++) {
      const header = headers[i];
      if (header !== '') {
        const headerPair = header.split(/\s*:\s*/);
        const name = headerPair[0];
        let value = headerPair[1];

        switch (name.toLowerCase()) {
          case 'content-disposition':
            //capture file name
            if (/filename="([^"]+)"/.exec(value)) {
              result.fileName = RegExp.$1;
            }
            // capture field name
            value = value.replace(/filename="([^"]+)"/, '');
            /* istanbul ignore else */
            if (/name="([^"]+)"/.exec(value)) {
              result.fieldName = RegExp.$1;
            }
            break;

          case 'content-type':
            result.isFile = true;
            result.type = value.split(/;\s*/)[0];
            break;
        }
      }
    }
    return result;
  }

  /**
   * parse multipart form data
   *@see https://www.w3.org/Protocols/rfc1341/7_2_Multipart.html
   */
  private parseMultiPart(string: string, boundary: string | null) {
    const body = {},
      files = {};

    //if boundary is null, detect it using the last encapsulation boundary format
    if (isNull(boundary)) {
      if (!/^-{2}(-*[a-z0-9]+)-{2}/gim.test(string)) {
        return { body, files };
      }
      boundary = RegExp.$1;
    }

    //some implementations fails to start the first encapsulation boundary
    // with CRLF character when there is no preamble
    const testPattern = new RegExp(`^--${boundary}`, 'gm');
    /* istanbul ignore else */
    if (testPattern.test(string)) {
      string = CRLF + string;
    }

    const crlfPattern = new RegExp(CRLF, 'gm');
    const boundaryLinePattern = new RegExp(`${CRLF}--${boundary}`, 'gm');
    const blankLinePattern = new RegExp(BLANK_LINE, 'gm');

    //obtain body parts, discard preamble and epilogue
    string
      .split(boundaryLinePattern)
      .slice(1, -1)
      .forEach((bodyPart) => {
        const [header, ...others] = bodyPart.split(blankLinePattern);

        const content = others.join(BLANK_LINE);
        const headers = this.parseHeaders(header.split(crlfPattern));

        /* istanbul ignore else */
        if (headers.isFile && headers.fileName) {
          this.assignFileValue(
            files,
            headers.fieldName,
            this.processFile(headers, content)
          );
        } else if (!headers.isFile) {
          this.assignBodyValue(body, headers.fieldName, content);
        }
      });

    return { body, files };
  }

  /**
   * parse json content
   */
  private parseJSON(string: string): Data {
    try {
      const result = JSON.parse(string);
      return result;
    } catch (ex) {
      return {};
    }
  }

  /**
   * parse url encoded request body
   */
  private parseUrlEncoded(string: string): Data {
    const body: Data = {};
    if (string) {
      const pairs = string.split('&');
      pairs.forEach((pair) => {
        const [name, value] = pair.split('=');
        this.assignBodyValue(
          body,
          decodeURIComponent(name),
          decodeURIComponent(value || '')
        );
      });
    }
    return body;
  }

  /**
   * parse the query parameters in the given url
   */
  parseQueryString(url: string): Data {
    if (url.indexOf('?') > -1) {
      return this.parseUrlEncoded(url.split('?')[1]);
    } else {
      return {};
    }
  }

  /**
   * converts url search parameters to object
   * @param searchParams
   * @returns
   */
  urlSearchParamsToObject(searchParams: URLSearchParams) {
    const result: Data = {};
    for (const key of searchParams.keys()) {
      result[key] = searchParams.get(key);
    }
    return result;
  }

  /**
   *@param {Buffer} buffer - the buffer data
   *@param {string} contentType - the request content type
   */
  parse(buffer: Buffer, contentType: string): { files: Files; body: Data } {
    const content = buffer.toString(this.encoding);
    const tokens = contentType.split(/;\s*/);

    let boundary: string | null = null;

    switch (tokens[0].toLowerCase()) {
      case 'text/plain':
      case 'application/x-www-form-urlencoded':
        return { files: {}, body: this.parseUrlEncoded(content) };

      case 'text/json':
      case 'application/json':
        return { files: {}, body: this.parseJSON(content) };

      case 'multipart/form-data':
        if (tokens.length === 2 && /boundary\s*=\s*/.test(tokens[1])) {
          boundary = tokens[1].split('=')[1];
        }
        return this.parseMultiPart(content, boundary);

      default:
        return { body: {}, files: {} };
    }
  }

  /**
   * clean up temp files
   */
  cleanUpTempFiles(files: Files) {
    const unlink = (path) => {
      if (fs.existsSync(path)) {
        fs.unlinkSync(path);
      }
    };

    const keys = Object.keys(files);
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      const file = files[key];

      makeArray(file.path).forEach(unlink);
    }
  }
}
