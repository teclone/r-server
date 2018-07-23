import {expect} from 'chai';

global.expect = expect;

/**
 * a workaround to istanbuls branching error on constructors that extends other constructors.
*/
global.getInstance = function(className, ...parameters) {
    let proto = className.__proto__;

    className.__proto__ = null;
    try {
        new className(...parameters);
    }
    catch(ex) {
        //
    }

    className.__proto__ = proto;
    return new className(...parameters);
};