'use strict';

var fs = require('fs');
var filbert = require('filbert');
var request = require('request');
var unzip = require('unzip');
var rp = require('request-promise');

var nuttiUtils = {
    isExistFile: function (file) {
        fs.readdir('.', function (err, files) {
            if (err) { throw err; }
            var fileList = [];
            files.filter(function(file) {
                return fs.statSync(file).isFile();
            }).forEach(function (file) {
                fileList.push(file);
            });
        });
        try {
            fs.statSync(file);
            return true;
        }
        catch (err) {
            if (err.code === 'ENOENT') {
                return false;
            }
            return false;
        }
    },

    isDirectory: function (file) {
        return fs.statSync(file).isDirectory();
    },

    parseBlInfo: function (args) {
        var info = {};

        for (var arg = 0; arg < args.length; ++arg) {
            var elms = args[arg].elements;
            var key = elms[0]["value"];
            var value = "";
            if (elms[1]["type"] == "Literal") {
                value = elms[1]["value"];
            }
            if (elms[1]["type"] == "NewExpression") {
                for (var i = 0; i < elms[1]["arguments"].length; ++i) {
                    value += elms[1]["arguments"][i]["value"];
                    value += ".";
                }
                value = value.slice(0, -1);
            }
            info[key] = value;
        }

        return info;
    },

    extractBlInfoBody: function(srcBody) {
        var blInfoBody = srcBody.substring(srcBody.indexOf("bl_info"));
        blInfoBody = blInfoBody.substring(0, blInfoBody.indexOf("}") + 1);

        return blInfoBody;
    },

    extractBlInfo: function(srcBody) {
        var info = {};
        var parsed = null;

        try {
            parsed = filbert.parse(srcBody);
        }
        catch (e) {
            console.log(e);
            return null;
        }
        if (parsed == null) {
            console.log("Failed to parse source.");
            return null;
        }

        var decls = parsed.body[0].declarations;
        var d = 0;
        for (d = 0; d < decls.length; ++d) {
            if (decls[d]["id"]["name"] == "bl_info") {
                var args = decls[d]["init"]["arguments"];
                info = this.parseBlInfo(args);
                break;
            }
        }
        if (d == decls.length) {
            console.log("bl_info is not found.");
            return null;
        }

        return info;
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
                fs.unlink(from);
            }
            onSuccess();
        });
    }
};

module.exports = nuttiUtils;
