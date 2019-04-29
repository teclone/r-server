import Wrapper from '../../src/modules/Wrapper';
import Router from '../../src/modules/Router';
import { dummyCallback } from '../helpers';
import { Method } from '../../src/@types';

describe('Wrapper', function() {
    const url = '/user';
    let wrapper: Wrapper = null,
        router: Router = null;

    beforeEach(function() {
        router = new Router(false);
        wrapper = new Wrapper(router, url);
    });

    const getTemplate = (method: Method) => {
        return function() {
            const banner = 'should call router to store the given route rule for http ' +
                method.toUpperCase() + ' method for the given wrapped url';

            it(banner, function() {
                const spy = jest.spyOn(router, method);
                wrapper[method](dummyCallback);

                expect(spy.mock.calls[0][0]).toEqual('/user');
                expect(spy.mock.calls[0][1]).toEqual(dummyCallback);

                spy.mockRestore();
            });
        };
    };

    describe('#constructor(router: Router, url: Url)', function() {
        it(`should create a route Wrapper instance when called`, function() {
            expect(wrapper).toBeInstanceOf(Wrapper);
        });
    });

    describe(`#options(callback: Callback,
        options: Middleware | Middleware[] | CallbackOptions | null = null)`, getTemplate('options'));

    describe(`#head(callback: Callback,
        options: Middleware | Middleware[] | CallbackOptions | null = null)`, getTemplate('head'));

    describe(`#get(callback: Callback,
        options: Middleware | Middleware[] | CallbackOptions | null = null)`, getTemplate('get'));

    describe(`#post(callback: Callback,
        options: Middleware | Middleware[] | CallbackOptions | null = null)`, getTemplate('post'));

    describe(`#put(callback: Callback,
        options: Middleware | Middleware[] | CallbackOptions | null = null)`, getTemplate('put'));

    describe(`#delete(callback: Callback,
        options: Middleware | Middleware[] | CallbackOptions | null = null)`, getTemplate('delete'));
});