export default {
    /**
     * log error message to the console
     *@param {string} message - the error message
    */
    error(message) {
        console.log('\x1b[1m\x1b[31m%s\x1b[0m', message);
    },

    /**
     * log info message to the console
     *@param {string} message - the info message
    */
    info(message) {
        console.log('\x1b[1m\x1b[32m%s\x1b[0m', message);
    },

    /**
     * log request response profile
     *@param {http.IncomingMessage} req - the request object
     *@param {RServerResponse} res - the response object
    */
    logProfile(req, res) {
        if (res.statusCode >= 400)
            console.log('%s: %s \x1b[31m%d\x1b[0m ~%dms ~%dms\x1b[0m', req.method, req.url,
                res.statusCode, res.startTime - req.startTime, Date.now() - res.startTime);
        else
            console.log('%s: %s \x1b[32m%d\x1b[0m ~%dms ~%dms\x1b[0m', req.method, req.url,
                res.statusCode, res.startTime - req.startTime, Date.now() - res.startTime);
    }
};