import { BodyParser } from '../../src/modules/BodyParser';
import {
  multipartLogFile,
  multipartBoundary,
  multipartLogFileNoBoundary,
} from '../helpers';
import { encodeData } from '@teclone/utils';
import * as fs from 'fs';

describe('BodyParser', function () {
  let bodyParser: BodyParser;

  const data = {
    username: 'harrison',
    password1: 'random_243',
    password2: 'random_243',
    languages: ['Java', 'PHP', 'JavaScript', 'Ruby', 'Python'],
  };

  const buffer = Buffer.from(encodeData(data));

  beforeEach(function () {
    bodyParser = new BodyParser();
  });

  describe(`#constructor(entryPath: string, config: RServerConfig)`, function () {
    it(`should create a body parser instance`, function () {
      expect(bodyParser).toBeInstanceOf(BodyParser);
    });
  });

  describe(`#urlSearchParamsToObject(searchParams: URLSearchParams)`, function () {
    it(`should convert the search params to object of key value pairs`, function () {
      const urlSearchParams = new URLSearchParams('key1=value1&key2=value2');
      expect(bodyParser.urlSearchParamsToObject(urlSearchParams)).toMatchObject(
        {
          key1: 'value1',
          key2: 'value2',
        }
      );
    });
  });

  describe(`#parse(buffer: Buffer, contentType: string): {files: Files, body: Data}`, function () {
    it(`should inspect the given contentType, and parse the buffer data accordingly, passing
          as urlencoded if contentType is text/plain or application/x-www-form-urlencoded`, function () {
      expect(bodyParser.parse(buffer, 'text/plain')).toEqual(data);
      expect(
        bodyParser.parse(buffer, 'application/x-www-form-urlencoded')
      ).toEqual(data);
    });

    it(`should inspect the given contentType, and parse the buffer data accordingly, passing
            content as json encoded if contentType is text/json or application/json`, function () {
      const buffer = Buffer.from(JSON.stringify(data));
      expect(bodyParser.parse(buffer, 'text/json')).toMatchObject(data);
      expect(bodyParser.parse(buffer, 'application/json')).toMatchObject(data);
    });

    it(`should catch json decode error for erronous json strings and return empty object`, function () {
      const erronousJson = "{'age': 20}";
      const buffer = Buffer.from(erronousJson);
      expect(bodyParser.parse(buffer, 'text/json')).toEqual({});
    });

    it(`should inspect the given contentType, and parse the buffer data accordingly, passing
            data as multipart form data if contentType is
            multipart/form-data`, function () {
      const buffer = fs.readFileSync(multipartLogFile);
      const contentType = `multipart/form-data; boundary=${multipartBoundary}`;

      const result = bodyParser.parse(buffer, contentType);
      expect(result).toMatchObject(data);
    });

    it(`should detect the multipart boundary if not given`, function () {
      const buffer = fs.readFileSync(multipartLogFile);
      const contentType = `multipart/form-data`;

      const result = bodyParser.parse(buffer, contentType);
      expect(result).toMatchObject(data);
    });

    it(`should return empty object if multipart boundary is not given and it
        could not be detected`, function () {
      const buffer = fs.readFileSync(multipartLogFileNoBoundary);
      const contentType = `multipart/form-data`;

      const result = bodyParser.parse(buffer, contentType);
      expect(result).toEqual({});
    });

    it(`should do nothing if contentType is not recognised and return object`, function () {
      const buffer = Buffer.from(JSON.stringify(data));
      expect(bodyParser.parse(buffer, '')).toEqual({});
    });
  });
});
