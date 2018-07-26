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
};