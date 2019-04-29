import * as path from 'path';
import * as fs from 'fs';

export const joinPaths = (...paths: string[]): string => {
    return path.join(...paths);
};

export const resolvePaths = (...paths: string[]): string => {
    return path.resolve(...paths);
};

export const mkDirSync = (dirPath: string): void => {
    const extname = path.extname(dirPath);
    dirPath = extname !== ''? path.dirname(dirPath) : dirPath;
    if (!fs.existsSync(dirPath)) {
        let existingPath = '';
        let current = dirPath;
        while (existingPath === '' && current !== '/' && current !== '') {
            current = path.join(current, '../');
            if (fs.existsSync(current)) {
                existingPath = current;
            }
        }

        dirPath.split(existingPath)[1].split('/').forEach(pathToken => {
            existingPath = path.join(existingPath, pathToken);
            fs.mkdirSync(existingPath);
        });
    }
};