module.exports = {
    env: 'dev',
    https: {
        enabled: true,
        enforce: false,
        credentials: {
            key: ".cert/server.key",
            cert: ".cert/server.crt"
        }
    }
};