import { Data, MultipartHeaders, FileEntry, Query } from '../@types/index';
import { generateRandomText } from '@teclone/utils';
import { CRLF, BLANK_LINE } from './Constants';

export interface BodyParserConstructOpts {
  tempDir: string;
}

export class BodyParser {
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
   * stores a file into the given files object
   */
  private assignDataEntry(
    data: Data,
    fieldName: string,
    value: FileEntry | string
  ) {
    const { name, isMultiValue } = this.resolveFieldName(fieldName);
    if (!isMultiValue) {
      data[name] = value;
      return;
    }
    if (typeof data[name] === 'undefined') {
      data[name] = [];
    }
    (data[name] as Array<typeof value>).push(value);
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
    };

    for (let i = 0; i < headers.length; i++) {
      const header = headers[i];
      if (!header) {
        continue;
      }
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
    return result;
  }

  /**
   * parse multipart form data
   *@see https://www.w3.org/Protocols/rfc1341/7_2_Multipart.html
   */
  private parseMultiPart(string: string, headerBoundary: string | null): Data {
    const result: Data = {};

    //if boundary is null, detect it using the last encapsulation boundary format
    if (!headerBoundary) {
      if (!/^-{2}(-*[a-z0-9]+)-{2}/gim.test(string)) {
        return {};
      }
      headerBoundary = RegExp.$1;
    }

    //some implementations fails to start the first encapsulation boundary
    // with CRLF character when there is no preamble
    const boundary = '--' + headerBoundary;
    if (string.startsWith(boundary)) {
      string = CRLF + string;
    }

    // extract body parts, dropping preamble and epilogue
    const bodyParts = string
      .split(new RegExp(`${CRLF}${boundary}`, 'gm'))
      .slice(1, -1);

    const crlfPattern = new RegExp(CRLF, 'gm');

    const blankLinePattern = new RegExp(BLANK_LINE, 'gm');

    //obtain body parts, discard preamble and epilogue
    bodyParts.forEach((bodyPart) => {
      const [header, ...others] = bodyPart.split(blankLinePattern);

      const content = others.join(BLANK_LINE);
      const headers = this.parseHeaders(header.split(crlfPattern));

      /* istanbul ignore else */
      if (headers.isFile && headers.fileName) {
        const data = Buffer.from(
          content,
          headers.type.startsWith('text/') ? 'utf8' : 'binary'
        );
        this.assignDataEntry(result, headers.fieldName, {
          name: headers.fileName.replace(/\.\./g, ''),
          data,
          size: data.byteLength,
          type: headers.type,
        });
      } else if (!headers.isFile) {
        this.assignDataEntry(result, headers.fieldName, content);
      }
    });

    return result;
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
  private parseUrlEncoded(string: string): Query {
    const result: Query = {};
    if (string) {
      const pairs = string.split('&');
      pairs.forEach((pair) => {
        const [name, value] = pair.split('=');
        this.assignDataEntry(
          result,
          decodeURIComponent(name),
          decodeURIComponent(value || '')
        );
      });
    }
    return result;
  }

  /**
   * parse the query parameters in the given url
   */
  parseQueryString(url: string): Query {
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
  parse(buffer: Buffer, contentType: string): Data {
    const content = buffer.toString('latin1');
    const tokens = contentType.split(/;\s*/);

    if (tokens[0].startsWith('multipart')) {
      const matches = /boundary\s*=\s*([^;\s,]+)/.exec(contentType);
      return this.parseMultiPart(content, matches?.[1]);
    }

    switch (tokens[0].toLowerCase()) {
      case 'text/plain':
      case 'application/x-www-form-urlencoded':
        return this.parseUrlEncoded(content);

      case 'text/json':
      case 'application/json':
        return this.parseJSON(content);

      default:
        return {};
    }
  }
}
