'use strict';

import fs from 'fs';
import request from 'request';
import unzip from 'unzip';

import pydict_parser from 'pydict_parser_t';
const pyDictParser = new PyDictParser();
import Logger from 'logger_t';
const logger = new Logger();


export function isExistFile(file) {
    try {
        fs.statSync(file);
        return true;
    }
    catch (err) {
        return false;   // 'ENOENT'
    }
}

export function isDirectory(file) {
    try {
        return fs.statSync(file).isDirectory();
    }
    catch (err) {
        return false;   // 'ENOENT'
    }
}

export function is(type, obj) {
    let t = Object.prototype.toString.call(obj).slice(8, -1);
    return obj !== undefined && obj !== null && t === type;
}


export function extractBlInfoBody(srcBody) {
    let result = srcBody.match(/\n*(bl_info\s*=\s*)([\s\S]*)$/);
    if (!result || !result[2]) { return null; }
    return result[2];
}

export function parseBlInfo(srcBody) {
    let parsed = null;

    try {
        parsed = parser.parse(srcBody);
    }
    catch (e) {
        logger.category('lib').warn("==========Parse Error=========");
        logger.category('lib').warn("---srcBody---");
        logger.category('lib').warn(srcBody);
        logger.category('lib').warn("---Exception---");
        logger.category('lib').warn(e);
        return null;
    }
    if (parsed == null) {
        logger.category('lib').warn("Failed to parse source.");
        return null;
    }

    if (parsed['version']) {
       parsed['version'] = parsed['version'].join('.');
    }
    if (parsed['blender']) {
       parsed['blender'] = parsed['blender'].join('.');
    }

    return parsed;
}

// [TODO] check if proxy config is valid
function _isProxyConfigValid(config) {
    if (!config) { return false; }
    if (!config.proxy) { return false; }
    if (!config.proxy.username_enc) { return false; }
    if (!config.proxy.password) { return false; }
    if (!config.proxy.server) { return false; }
    if (!config.proxy.port) { return false; }

    return true;
}

// [TODO] get proxy URL
function _getProxyURL(config) {
    if (!isProxyConfigValid(config)) { return null; }
    let url =
        'http://'
        + config.proxy.username_enc
        + ":"
        + config.proxy.password
        + "@"
        + config.proxy.server
        + ":"
        + config.proxy.port;

    return url;
}

export function downloadFile(config, url, saveTo) {
    return new Promise( (resolve) => {
        let r;
        // send request to api server
        var proxyURL = _getProxyURL(config);
        if (proxyURL) {
            r = request({
                tunnel: true,
                url: url,
                json: true,
                proxy: proxyURL
            });
        }
        else {
            logger.category('lib').info("Not use proxy server");
            r = request({
                url: url,
                json: true
            });
        }
        let localStream = fs.createWriteStream(tmp);
        r.on('response', function(response) {
            if (response.statusCode === 200) {
                r.pipe(localStream);
                localStream.on('close', function() {
                    resolve();
                    //obj.extractZipFile([tmp, saveTo], true, onSuccess);
                });
            }
            else {
                throw new Error("Failed to download " + url);
            }
        });
    });
}

export function extractZipFile(paths, deleteOriginal) {
    return new Promise( (resolve) => {
        let from_ = paths[0];
        let to = paths[1];
        let stream = fs.createReadStream(from_).pipe(unzip.Extract({path: to}));
        stream.on('close', () => {
            if (deleteOriginal) {
                logger.category('lib').info("Deleting original file ...");
                fs.unlinkSync(from_);
            }
            resolve();
        });
    });
}

export function genBlAddonKey(name, author) {
    return name + '@' + author;
}
