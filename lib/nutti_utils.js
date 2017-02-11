'use strict';

var fs = require('fs');
var request = require('request');
var unzip = require('unzip');
var rp = require('request-promise');

var parser = require('pydict_parser');

var nuttiUtils = {
    isExistFile: function (file) {
        try {
            fs.statSync(file);
            return true;
        }
        catch (err) {
            return false;   // 'ENOENT'
        }
    },

    isDirectory: function (file) {
        try {
            return fs.statSync(file).isDirectory();
        }
        catch (err) {
            return false;   // 'ENOENT'
        }
    },


    extractBlInfoBody: function(srcBody) {
        var result = srcBody.match(/\n*(bl_info\s*=\s*)([\s\S]*)$/);
        if (!result || !result[2]) { return null; }
        return result[2];
    },

    parseBlInfo: function(srcBody) {
        var parsed = null;

        try {
            parsed = parser.parse(srcBody);
        }
        catch (e) {
            console.log("==========Parse Error=========");
            console.log("---srcBody---");
            console.log(srcBody);
            console.log("---Exception---");
            console.log(e);
            return null;
        }
        if (parsed == null) {
            console.log("Failed to parse source.");
            return null;
        }

        if (parsed['version']) {
           parsed['version'] = parsed['version'].join('.');
        }
        if (parsed['blender']) {
           parsed['blender'] = parsed['blender'].join('.');
        }


        return parsed;
    },

    downloadFile: function (url, proxyConf, tmp, saveTo, onSuccess) {
        var obj = this;
        var r = request({
            url: url,
            proxy: 'http://' + proxyConf.proxy.username_enc + ":" + proxyConf.proxy.password + "@" + proxyConf.proxy.server + ":" + proxyConf.proxy.port
        });
        var localStream = fs.createWriteStream(tmp);
        r.on('response', function(response) {
            if (response.statusCode === 200) {
                r.pipe(localStream);
                localStream.on('close', function() {
                    obj.extractZipFile([tmp, saveTo], true, onSuccess);
                });
            }
            else {
                console.log("err");
            }
        });
    },

    downloadAndExtract: function(url, proxyConf, tmp, saveTo, onSuccess) {
        this.downloadFile(url, proxyConf, tmp, saveTo, onSuccess);
    },

    extractZipFile: function (paths, deleteOriginal, onSuccess) {
        var from = paths[0];
        var to = paths[1];
        var stream = fs.createReadStream(from).pipe(unzip.Extract({ path: to }));
        stream.on('close', function() {
            if (deleteOriginal) {
                console.log("Deleting original file ...");
                fs.unlinkSync(from);
            }
            onSuccess();
        });
    },

    genBlAddonKey: function(name, author) {
        return name + '@' + author;
    },
};

module.exports = nuttiUtils;
