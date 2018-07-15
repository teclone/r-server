//this module extends the http ServerResponse and IncomingMessage classes
import http from 'http';

/**
 * sends a json content back to the browser
*/
http.ServerResponse.prototype.json = function() {

};

/**
 * prompts a file download
*/
http.ServerResponse.prototype.download = function() {

}

export default http;