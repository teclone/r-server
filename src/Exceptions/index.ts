/**
 * exception base class
 */
export default class Exception extends Error {
  constructor(message: string, domain: any = Exception) {
    super(message);

    const construct = domain.prototype.constructor;
    this.message = message;
    this.name = construct.name;

    Error.captureStackTrace(this);
  }
}
