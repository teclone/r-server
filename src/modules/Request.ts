import { IncomingMessage } from 'http';
import { Http2ServerRequest } from 'http2';
import { Data, Files, Method } from '../@types';

export type ServerRequest<
  T extends typeof IncomingMessage | typeof Http2ServerRequest =
    | typeof IncomingMessage
    | typeof Http2ServerRequest
> = Omit<InstanceType<T>, 'method'> & {
  parsedUrl: URL;

  error: boolean;

  startedAt: Date;

  endedAt: Date | null;

  files: Files;

  query: Data;

  body: Data;

  data: Data;

  buffer: Buffer;

  entityTooLarge: boolean;

  encrypted: boolean;

  method: Method;

  initialized: boolean;

  init: (this: ServerRequest<T>, encrypted: boolean) => void;

  prototype: ServerRequest<T>;
};

const createRequestClass = <
  T extends typeof IncomingMessage | typeof Http2ServerRequest
>(
  BaseRequestClass: T,
  opts: {
    init: (this: ServerRequest<T>, encrypted: boolean) => void;
  }
): T => {
  const { init } = opts;

  const RequestClass = BaseRequestClass as any as ServerRequest<T>;

  RequestClass.prototype.init = function (encrypted) {
    this.buffer = Buffer.alloc(0);

    this.files = {};
    this.query = {};
    this.body = {};

    // data is a merge of query and body
    this.data = {};

    if (init) {
      init.call(this, encrypted);
    }
  };

  return RequestClass as any as T;
};

// HTTP1Request
class Http1BaseRequest extends IncomingMessage {}
export const Http1Request = createRequestClass(Http1BaseRequest, {
  init(encrypted) {
    if (!this.initialized) {
      this.startedAt = new Date();
      this.entityTooLarge = false;

      this.method = this.method.toLowerCase() as Method;
      const host = this.headers['host'];
      const protocol = encrypted ? 'https' : 'http';

      this.encrypted = encrypted;
      this.parsedUrl = new URL(this.url, `${protocol}://${host}`);

      this.initialized = true;
    }
  },
});

// HTTP2Request
class Http2BaseRequest extends Http2ServerRequest {}
export const Http2Request = createRequestClass(Http2BaseRequest, {
  init(encrypted) {
    this.startedAt = new Date();
    this.entityTooLarge = false;

    const host = this.authority;
    const protocol = encrypted ? 'https' : 'http';
    this.method = this.method.toLowerCase() as Method;

    this.encrypted = encrypted;
    this.parsedUrl = new URL(this.url, `${protocol}://${host}`);

    this.initialized = true;
  },
});
