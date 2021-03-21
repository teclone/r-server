import { IncomingMessage } from 'http';
import { Files, Data, Method } from '../@types';
import { Socket } from 'net';

export class Request extends IncomingMessage {
  error: boolean = false;

  startedAt: Date | null = null;

  endedAt: Date | null = null;

  files: Files = {};

  query: Data = {};

  body: Data = {};

  data: Data = {};

  buffer: Buffer = Buffer.alloc(0);

  entityTooLarge: boolean = false;

  encrypted: boolean = false;

  hostname: string = '';

  method: Exclude<Method, '*'>;

  constructor(socket: Socket) {
    super(socket);
  }
}
