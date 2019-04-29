import {joinPaths, resolvePaths, mkDirSync} from '../../src/modules/Util';
import * as fs from 'fs';
import rimraf from 'rimraf';

describe('Util', function() {
    describe('.joinPaths(...paths: string[]): string', function() {
        it(`should join the path arguments and return the result`, function() {
            expect(joinPaths('/users', '1/profile')).toEqual('/users/1/profile');
        });
    });

    describe('.resolvePaths(...paths: string[]): string', function() {
        it(`should resolve the path arguments and return the result`, function() {
            expect(resolvePaths('/users', '1/profile')).toEqual('/users/1/profile');
            expect(resolvePaths('/users', '/1/profile')).toEqual('/1/profile');
        });
    });

    describe('.mkDirSync(dirPath: string)', function() {
        it(`should synchronously and recursively create the given directory if it does
            not exist`, function() {
            const dirPath = resolvePaths(__dirname, '../../../arbitrary');

            expect(fs.existsSync(dirPath)).toBeFalsy();
            mkDirSync(dirPath);
            expect(fs.existsSync(dirPath)).toBeTruthy();
            fs.rmdirSync(dirPath);
        });

        it(`should extract the directory path if path points to a file before proceeding`, function() {
            const dirPath = resolvePaths(__dirname, '../../../arbitrary/modules/package.json');

            expect(fs.existsSync(dirPath)).toBeFalsy();
            mkDirSync(dirPath);
            expect(fs.existsSync(dirPath)).toBeFalsy();
            expect(fs.existsSync(resolvePaths(dirPath, '../'))).toBeTruthy();
            rimraf.sync(resolvePaths(dirPath, '../../'));
        });

        it(`should do nothing if directory exists`, function() {
            const dirPath = resolvePaths(__dirname, '../../../src');
            mkDirSync(dirPath);
        });
    });
});