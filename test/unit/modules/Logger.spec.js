import Logger from '../../../src/modules/Logger';
import path from 'path';
import fs from 'fs';
import sinon from 'sinon';
import { ERROR_LEVELS } from '../../../src/modules/Constants';
import config from '../../../src/.rsvrc.json';

describe('Logger Module', function() {
    let logger = null,
        errorLog = '',
        accessLog = '';

    beforeEach(function() {
        errorLog = path.resolve(__dirname, '../../../.error.log');
        accessLog = path.resolve(__dirname, '../../../.access.log');

        //clear the files
        fs.writeFileSync(errorLog, '');
        fs.writeFileSync(accessLog, '');

        logger = new Logger(
            errorLog,
            accessLog,
            config
        );
    });

    describe('#constructor(errorLog, accessLog, config)', function() {
        it('should create a Logger instance', function() {
            expect(logger).to.be.a('Logger');
        });
    });

    describe('close()', function() {
        it('should close the error and access log file handles when called', function() {
            logger.close();
        });
    });

    describe('logError(level, stack)', function() {
        it('should log the given error to the error log file', function() {
            const err = new Error('testing error logging');
            logger.logError(ERROR_LEVELS.FATAL, err.stack);

            expect(fs.readFileSync(errorLog)).not.to.equals('');
        });
    });

    describe('warn(message)', function() {
        it('should log the given error warning to the console', function() {
            sinon.spy(console, 'log');
            logger.warn('testing warning');
            expect(console.log.called).to.be.true;
            console.log.restore();
        });
    });

    describe('info(message)', function() {
        it('should info the given success message to the console', function() {
            sinon.spy(console, 'log');
            logger.info('testing warning');
            expect(console.log.called).to.be.true;
            console.log.restore();
        });
    });
});