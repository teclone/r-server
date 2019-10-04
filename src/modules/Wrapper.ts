import Router from './Router';
import { Callback, CallbackOptions, Middleware } from '../typings';

export default class Wrapper {
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
  options(callback: Callback, options?: Middleware | Middleware[] | CallbackOptions): this {
    this.router.options(this.url, callback, options);
    return this;
  }

  /**
   * stores route rules for http HEAD method
   *
   * @param callback - route callback handler
   * @param options - route configuration object or middleware or array of middlewares
   */
  head(callback: Callback, options?: Middleware | Middleware[] | CallbackOptions): this {
    this.router.head(this.url, callback, options);
    return this;
  }

  /**
   * stores route rules for http GETmethod
   *
   * @param callback - route callback handler
   * @param options - route configuration object or middleware or array of middlewares
   */
  get(callback: Callback, options?: Middleware | Middleware[] | CallbackOptions): this {
    this.router.get(this.url, callback, options);
    return this;
  }

  /**
   * stores route rules for http POST method
   *
   * @param callback - route callback handler
   * @param options - route configuration object or middleware or array of middlewares
   */
  post(callback: Callback, options?: Middleware | Middleware[] | CallbackOptions): this {
    this.router.post(this.url, callback, options);
    return this;
  }

  /**
   * stores route rules for http PUT method
   *
   * @param callback - route callback handler
   * @param options - route configuration object or middleware or array of middlewares
   */
  put(callback: Callback, options?: Middleware | Middleware[] | CallbackOptions): this {
    this.router.put(this.url, callback, options);
    return this;
  }

  /**
   * stores route rules for http DELETE method
   *
   * @param callback - route callback handler
   * @param options - route configuration object or middleware or array of middlewares
   */
  delete(callback: Callback, options?: Middleware | Middleware[] | CallbackOptions): this {
    this.router.delete(this.url, callback, options);
    return this;
  }
}
