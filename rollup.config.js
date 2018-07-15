import path from 'path';
import fs from 'fs';

import resolve from 'rollup-plugin-node-resolve';
import babel from 'rollup-plugin-babel';
import {uglify} from 'rollup-plugin-uglify';

/**
 *@description - converts the letters into camel like cases
 *@param {string} value - the string word to convert
 *@param {string|RegExp} [delimiter=/[-_]/] - a delimiter string or regex pattern used in
 * finding split segments
 *@returns {string}
*/
function camelCase(value, delimiter = /[-_]/) {
    value = value.toString();
    let tokens = value.split(delimiter).map((token, idx) => {
        return idx === 0? token : token[0].toUpperCase() + token.substring(1);
    });
    return tokens.join('');
}

/**
 * resolves the pattern into a regex object
 *@param {Array|string} patterns -array of patterns or string pattern
*/
function resolveRegex(patterns) {
    if (patterns === '*')
        return [new RegExp('.*')];

    if (Object.prototype.toString.call(patterns) === '[object Array]') {
        return patterns.map((pattern) => {
            pattern = pattern.replace(/\./g, '\.').replace(/\*{2}/g, '.*').replace(/\*/g, '[^/]+');
            return new RegExp(pattern, 'i');
        });
    }

    return [];
}

/**
 * returns the config for the given file
 *@param {boolean} _uglify - boolean value indicating if file should be minified
 *@param {Object} options - object options
 *@param {string} options.format - the expected output format
 *@param {string} options.src - the file source directory
 *@param {string} options.dest - the file destination directory, omit the .js extension
 *@param {string} name - the file module name
 *@param {Array} externals - array of module externals
 *@returns {Object}
*/
function getConfig(_uglify, options, name, externals) {
    let plugins = [
        resolve(),
        babel({
            exclude: 'node_modules/**',
            plugins: ["external-helpers"]
        })
    ];

    if (_uglify)
        plugins.push(uglify());

    return {
        input: options.src,
        output: {
            file: options.dest + (_uglify? '.min' : '') + options.ext,
            format: options.format,
            name: camelCase(name),
            interop: false,
            //sourcemap: true
        },
        plugins: plugins,
        external: externals
    };
}

/**
 * returns the allowed exports for each build kind
 *@param {Object} options - options object
 *@param {string} options.outDir - the out directory for the build kind
 *@param {string} options.format - the output format for all included modules in this build
 *@param {boolean} options.uglify - boolean value indicating if modules should be uglified
 *@param {boolean} options.uglifyOnly - boolean value indicating if only uglified outputs should
 * be produced
 *@param {Array} modules - the modules list to build from
 *@param {Array} externalModules - array of external modules
*/
function getExports(exports, options, modules, externalModules, includes, excludes) {
    let src = null,
    regexMatches = function(regex) {
        return regex.test(src);
    },
    filterExternalModules = function(externalModule) {
        return externalModule !== src;
    };

    for (let _module of modules) {
        src = _module.absPath + _module.ext;
        if (!includes.some(regexMatches) || excludes.some(regexMatches))
            continue;

        let dest = options.outDir + '/' + _module.relPath;
        if (_module.isAsset) {
            if (options.copyAssets) {
                const dir = path.dirname(dest);
                if (!fs.existsSync(dir))
                    fs.mkdirSync(dir);

                fs.writeFileSync(dest, fs.readFileSync(src));
            }
            continue;
        }

        let externals = externalModules.filter(filterExternalModules);
        if(!options.uglifyOnly)
            exports.push(getConfig(false, {
                src: src,
                dest: dest,
                format:options.format,
                ext: _module.ext
            }, _module.name, externals));

        if (options.uglifyOnly || options.uglify)
            exports.push(getConfig(true, {
                src: src,
                dest: dest,
                format:options.format,
                ext: _module.ext
            }, _module.name, externals));
    }
}

/**
 * gets all modules
 *@param {Array} modules - array to store modules
 *@param {string} dir - the root module directory to iterate
 *@param {string} mainModuleName - the global module name for the main export file.
 * others are mapped to file names
 *@returns {Array}
*/
function getModules(modules, resolvedPath, mainModuleName, srcPaths, fileExtensions) {
    let files = fs.readdirSync(resolvedPath);
    for (let file of files) {
        let filePath = resolvedPath + '/' + file;
        if (!fs.statSync(filePath).isFile()) {
            getModules(modules, filePath, mainModuleName, [...srcPaths, file], fileExtensions);
            continue;
        }

        let baseName = '', extname = path.extname(file);
        for (const fileExtension of fileExtensions) {
            if (fileExtension === extname) {
                baseName = path.basename(file, fileExtension);
                break;
            }
        }

        modules.push({
            name: baseName === 'main'? mainModuleName : baseName,
            ext: baseName? extname : '',
            relPath: [...srcPaths, baseName || file].join('/'),
            absPath: resolvedPath + '/' + (baseName || file),
            isAsset: baseName? false : true
        });
    }
    return modules;
}

//import build configurations
import buildConfig from './build.config.json';

//copy config
let config = buildConfig,
distConfig = typeof config.distConfig !== 'undefined'? config.distConfig : {},
libConfig = typeof config.libConfig !== 'undefined'? config.libConfig : {};

//resolve uglifyOnly settings and src directory settings
config.uglifyOnly = typeof config.uglifyOnly !== 'undefined'? config.uglifyOnly : false;
config.srcDir = typeof config.srcDir !== 'undefined'? config.srcDir : 'src';
config.copyAssets = typeof config.copyAssets !== 'undefined'? config.copyAssets : false;

//resolve and extend external modules
let externalModules = [];
if (config.externalModules)
    externalModules.push(...config.externalModules);

//resolve and extend file extensions
let fileExtensions = ['.js'];
if(config.fileExtensions)
    fileExtensions.push(...config.fileExtensions);

//resolve the default includes and exclude patterns
let includes = resolveRegex(config.include || '*'),
excludes = resolveRegex(config.exclude || null);

//get modules & extend external modules
let modules = getModules(
    [],
    path.resolve(__dirname, config.srcDir),
    config.mainModuleName || 'Module',
    [],
    fileExtensions
);

externalModules = [
    ...externalModules,
    ...modules.reduce((result, current) => {
        //if (!current.isAsset)
            result.push(current.absPath + current.ext);
        return result;
    }, [])
];

let exports = [];

//if lib config build is not disabled
if (!libConfig.disabled)
    getExports(
        exports,
        {
            outDir: path.resolve(__dirname, libConfig.outDir || 'lib'),
            format: libConfig.format || 'cjs',
            uglifyOnly: typeof libConfig.uglifyOnly !== 'undefined'? libConfig.uglifyOnly : config.uglifyOnly,
            uglify: libConfig.uglify? true : config.uglify,
            copyAssets: typeof libConfig.copyAssets !== 'undefined'? libConfig.copyAssets : config.copyAssets
        },
        modules,
        externalModules,
        libConfig.include? resolveRegex(libConfig.include) : includes,
        libConfig.exclude? resolveRegex(libConfig.exclude) : excludes
    );

if (!distConfig.disabled)
    getExports(
        exports,
        {
            outDir: path.resolve(__dirname, distConfig.outDir || 'dist'),
            format: distConfig.format || 'iife',
            uglifyOnly: typeof distConfig.uglifyOnly !== 'undefined'? distConfig.uglifyOnly : config.uglifyOnly,
            uglify: distConfig.uglify? true : config.uglify,
            copyAssets: typeof distConfig.copyAssets !== 'undefined'? distConfig.copyAssets : config.copyAssets
        },
        modules,
        [],
        distConfig.include? resolveRegex(distConfig.include) : includes,
        distConfig.exclude? resolveRegex(distConfig.exclude) : excludes
    );

export default exports;