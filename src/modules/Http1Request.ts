import { IncomingMessage } from 'http';
import { Files, Data, HttpProtocol } from '../@types';

export class Http1Request extends IncomingMessage {
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

  private initialized = false;

  constructor(socket) {
    super(socket);
  }

  /**
   * initialize the object
   */
  init(encrypted: boolean) {
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
  }
}
