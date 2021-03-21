import { Exception } from '.';

export class EntityTooLargeException extends Exception {
  constructor() {
    super('request entity too large', EntityTooLargeException);
  }
}
