'use strict';

var fs = require('fs');
var client = require('cheerio-httpcli');
var https = require('https');
var request = require('request');
var filbert = require('filbert');
var unzip = require('unzip');

var config = null;
var ADDON_DB_FILE = '../db/add-on_list.db';
var GITHUB_URL = 'https://github.com/';

var blAddonDB = {
    addonDB: {},

    init: function (c) {
        config = c;
    },

    downloadAddon: function (repoInfo) {
        if (config.proxy == null || config.proxy == undefined) {
            var r = request({
                url: repoInfo["download_url"],
            });
        }
        else {
            var r = request({
                tunnel: true,
                url: repoInfo["download_url"],
                proxy: 'http://' + config.proxy.username_enc + ":" + config.proxy.password + "@" + config.proxy.server + ":" + config.proxy.port
            });
        }

        r.on('response', function (res) {
            var targetPath = "./download/" + repoInfo["bl_info"]["name"] + ".zip";
            res.pipe(fs.createWriteStream(targetPath));
            fs.createReadStream(targetPath).pipe(unzip.Extract({ path: "./download/" }));
        });
    },

    getMainSrc: function (repoInfo) {
        return new Promise(function(res) {
            function loop(n) {
                return new Promise(function(resolve, reject) {
                    if (config.proxy == null || config.proxy == undefined) {
                        request({
                                url: repoInfo[n]["src_raw_url"]
                        }, onRequest);
                    }
                    else{
                        request(
                            {
                                tunnel: true,
                                url: repoInfo[n]["src_raw_url"],
                                proxy: 'http://' + config.proxy.username_enc + ":" + config.proxy.password + "@" + config.proxy.server + ":" + config.proxy.port
                            },
                            function (err, res, body) {
                                if (!err && res.statusCode == 200) {
                                    repoInfo[n]["main_src_body"] = body
                                    resolve(n + 1);
                                }
                            }
                        );
                    }
                })
                .then(function(count) {
                    if (count >= repoInfo.length) {
			    console.log(count);
                        res(repoInfo);
                    }
                    else {
                        loop(count);
                    }
                });

            }
            loop(0);
        });
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

    parseMainSrc: function (repoInfoList) {
        console.log(repoInfoList.length);
        for (var i = 0; i < repoInfoList.length; ++i) {
            var info = {};
            var parsed = null;
            var repoInfo = repoInfoList[i];
            var body = repoInfo["main_src_body"];

            try {
                var parsed = filbert.parse(body);
            }
            catch (e) {
                console.log(e);
                continue;
            }
            if (parsed == null) {
                continue;
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
            if (i == decls.length) {
                continue;
            }
            repoInfoList["bl_info"] = info;
        }

        this.addonDB = repoInfoList;
        console.log(this.addonDB);
    },

    getRepoURLs: function () {
        var repoURLs = [];
        return new Promise(function(res) {
            function loop(page) {
                return new Promise(function(resolve, reject) {
                    client.fetch(
                        'https://github.com/search',
                        {
                            q: 'bl_info',
                            type: 'Code',
                            ref: 'searchresults',
                            p: page
                        },
                        function(err, $, res) {
                            $('a').each(function(idx) {
                                var link = $(this).attr('href');
                                // only .py is allowed
                                if (link.slice(-3) == ".py") {
                                    repoURLs.push(link);
                                }
                            });
                            resolve(page + 1);
                        }
                    );
                })
                .then(function(count) {
                    if (count > 1) {
                        var infoList = [];
                        for (var i = 0; i < repoURLs.length; ++i) {
                            var info = {};
                            var repoURL = repoURLs[i];
                            info["url"] = GITHUB_URL + repoURL.slice(0, repoURL.indexOf('/blob/'));
                            info["src_main"] = repoURL.slice(repoURL.lastIndexOf('/') + 1);
                            info["src_url"] = GITHUB_URL + repoURL;
                            info["src_raw_url"] = info["src_url"].replace("github.com/", "raw.githubusercontent.com").replace("blob/", "");
                            info["download_url"] = info["url"] + "/archive/master.zip";
			    infoList.push(info);
                        }
                        res(infoList);
                    }
                    else {
                        loop(count);
                    }
                });
            }
            loop(1);
        });
    },

    buildAddonDB: function () {
        return new Promise(function(resolve) {
            resolve(1);
        });
    },

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

    loginGitHub: function (result) {
        return new Promise(function (resolve) {
            var loginInfo = {
                login: config.github.username,
                password: config.github.password
            };
            console.log("Login to GitHub as " + loginInfo.login + " ...");
            result.$('form').submit(loginInfo, function(err, $, res, body) {
                console.log("Login successfully.");
                resolve();
            });
        });
    },

    updateDBFile: function (file) {
        if (this.isExistFile(file)) {
            fs.unlink(file, function (err) {
                console.log("Removed old add-on database file");
            });
        }

        console.log('Updating DB file ...');
        client.fetch('https://github.com/login')
            .then(this.loginGitHub)
            .then(this.buildAddonDB)
            .then(this.getRepoURLs)
            .then(this.getMainSrc)
            .then(this.parseMainSrc.bind(this));

        console.log(this.addonDB);
    },

    readDBFile: function (file) {
        if (!this.isExistFile(file)) {
            console.log('Not found DB file...');
            return false;
        }

        console.log('Reading DB file...');

        var data = fs.readFileSync(file, 'utf8');
        var json = JSON.parse(data);

        return json;
    }
};

module.exports = blAddonDB;
