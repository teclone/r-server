import Exception from '.';

export default class EntityTooLargeException extends Exception {
  constructor() {
    super('request entity too large', EntityTooLargeException);
  }
}
