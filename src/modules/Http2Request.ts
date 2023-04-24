import { Files, Data, HttpProtocol } from '../@types';
import {
  Http2ServerRequest,
  IncomingHttpHeaders,
  ServerHttp2Stream,
} from 'http2';

export class Http2Request extends Http2ServerRequest {
  error: boolean = false;

  startedAt: Date;

  endedAt: Date | null = null;

  files: Files = {};

  query: Data = {};

  body: Data = {};

  data: Data = {};

  buffer: Buffer = Buffer.alloc(0);

  entityTooLarge: boolean;

  encrypted: boolean;

  host: string;
  port: number;

  hostname: string;
  protocol: HttpProtocol;

  private initialized: boolean;

  constructor(
    stream: ServerHttp2Stream,
    headers: IncomingHttpHeaders,
    options,
    rawHeaders: string[]
  ) {
    super(stream, headers, options, rawHeaders);
  }

  /**
   * call on request to initialize
   * @param encrypted
   */
  init(encrypted: boolean) {
    if (this.initialized) {
      this.startedAt = new Date();

      this.entityTooLarge = false;

      this.encrypted = encrypted;
      this.protocol = encrypted ? 'https' : 'http';

      this.host = this.authority;

      const [hostname, port] = this.authority.split(':');

      this.hostname = hostname;
      this.port = Number.parseInt(port);

      this.initialized = true;
    }
  }
}
