import { Router } from './Router';
import { Callback, Middleware } from '../@types';

export class Wrapper {
  private router: Router;

  private url: string;

  constructor(router: Router, url: string) {
    this.router = router;
    this.url = url;
  }

  /**
   * stores route rules for http OPTIONS method
   *
   * @param callback - route callback handler
   * @param options - route configuration object or middleware or array of middlewares
   */
  options(callback: Callback, use?: Middleware | Middleware[]): this {
    this.router.options(this.url, callback, use);
    return this;
  }

  /**
   * stores route rules for http HEAD method
   *
   * @param callback - route callback handler
   * @param options - route configuration object or middleware or array of middlewares
   */
  head(callback: Callback, use?: Middleware | Middleware[]): this {
    this.router.head(this.url, callback, use);
    return this;
  }

  /**
   * stores route rules for http GETmethod
   *
   * @param callback - route callback handler
   * @param options - route configuration object or middleware or array of middlewares
   */
  get(callback: Callback, use?: Middleware | Middleware[]): this {
    this.router.get(this.url, callback, use);
    return this;
  }

  /**
   * stores route rules for http POST method
   *
   * @param callback - route callback handler
   * @param options - route configuration object or middleware or array of middlewares
   */
  post(callback: Callback, use?: Middleware | Middleware[]): this {
    this.router.post(this.url, callback, use);
    return this;
  }

  /**
   * stores route rules for http PUT method
   *
   * @param callback - route callback handler
   * @param options - route configuration object or middleware or array of middlewares
   */
  put(callback: Callback, use?: Middleware | Middleware[]): this {
    this.router.put(this.url, callback, use);
    return this;
  }

  /**
   * stores route rules for http DELETE method
   *
   * @param callback - route callback handler
   * @param options - route configuration object or middleware or array of middlewares
   */
  delete(callback: Callback, use?: Middleware | Middleware[]): this {
    this.router.delete(this.url, callback, use);
    return this;
  }
}
