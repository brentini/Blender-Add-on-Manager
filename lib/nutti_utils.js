'use strict';

var fs = require('fs');
var filbert = require('filbert');
var request = require('request');

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

    downloadFile: function (url, proxyConf, saveTo) {
        if (proxyConf.proxy == null || proxyConf.proxy == undefined) {
            var r = request({
                url: url,
            });
        }
        else {
            var r = request({
                tunnel: true,
                url: url,
                proxy: 'http://' + proxyConf.proxy.username_enc + ":" + proxyConf.proxy.password + "@" + proxyConf.proxy.server + ":" + proxyConf.proxy.port
            });
        }

        r.on('response', function (res) {
            //var targetPath = "./download/" + repoInfo["bl_info"]["name"] + ".zip";
            res.pipe(fs.createWriteStream(saveTo));
            //fs.createReadStream(src).pipe(unzip.Extract({ path: "./download/" }));
        });
    },
};

module.exports = nuttiUtils;
