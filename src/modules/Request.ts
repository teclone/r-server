import { IncomingMessage } from 'http';
import { Http2ServerRequest } from 'http2';
import { Data, Files, HttpProtocol, Method } from '../@types';

export type ServerRequest<
  T extends typeof IncomingMessage | typeof Http2ServerRequest =
    | typeof IncomingMessage
    | typeof Http2ServerRequest
> = Omit<InstanceType<T>, 'method'> & {
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

  host: string;

  port: number;

  hostname: string;

  protocol: HttpProtocol;

  method: Method;

  initialized: boolean;

  init: (this: ServerRequest<T>, encrypted: boolean) => void;
};

type ServerRequestConstructor<
  T extends typeof IncomingMessage | typeof Http2ServerRequest
> = Omit<T, 'prototype'> & {
  new (...args: ConstructorParameters<T>): ServerRequest<T>;

  prototype: ServerRequest<T>;
};

const createRequestClass = <
  T extends typeof IncomingMessage | typeof Http2ServerRequest
>(
  BaseRequestClass: T,
  opts: {
    init: (this: ServerRequest<T>, encrypted: boolean) => void;
  }
) => {
  const { init } = opts;

  const newClass: ServerRequestConstructor<T> = function _constructor(
    this: ServerRequest<T>,
    ...args
  ) {
    BaseRequestClass.call(this, ...args);

    this.buffer = Buffer.alloc(0);

    this.files = {};
    this.query = {};
    this.body = {};

    // data is a merge of query and body
    this.data = {};
  } as unknown as ServerRequestConstructor<T>;

  Object.setPrototypeOf(newClass.prototype, BaseRequestClass.prototype);

  // end
  newClass.prototype.init =
    init ||
    function () {
      // do nothing
    };

  return newClass;
};

export const Http1Request = createRequestClass(IncomingMessage, {
  init(encrypted) {
    if (!this.initialized) {
      this.startedAt = new Date();
      this.entityTooLarge = false;

      this.encrypted = encrypted;
      this.protocol = encrypted ? 'https' : 'http';

      this.host = this.headers['host'];

      const [hostname, port] = this.host.split(':');

      this.hostname = hostname;
      this.port = Number.parseInt(port);

      this.initialized = true;
    }
  },
});

export const Http2Request = createRequestClass(Http2ServerRequest, {
  init(encrypted) {
    this.startedAt = new Date();

    this.entityTooLarge = false;

    this.encrypted = encrypted;
    this.protocol = encrypted ? 'https' : 'http';

    this.host = this.authority;

    const [hostname, port] = this.authority.split(':');

    this.hostname = hostname;
    this.port = Number.parseInt(port);

    this.initialized = true;
  },
});
