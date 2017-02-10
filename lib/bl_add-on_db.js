'use strict';

// external modules
var fs = require('fs');
var client = require('cheerio-httpcli');
var https = require('https');
var request = require('request');

// own modules
var utils = require('nutti_utils');
var dbWriter = require('db_writer');

var GITHUB_URL = 'https://github.com/';

var BL_INFO_UNDEF = "626c5f696e666f5f@UNDEF";

var config = null;

var blAddonDB = {
    config: null,
    addonDB: {},
    addonDBFile: "",
    startPage: 0,
    endPage: 1,
    minFileSize: 0,
    maxFileSize: 1000,

    // initialize
    init: function (config, startPage, endPage, minFileSize, maxFileSize) {
        if (config) { this.config = config; }
        if (startPage) { this.startPage = startPage; }
        if (endPage) { this.endPage = endPage; }
        if (minFileSize) { this.minFileSize = minFileSize; }
        if (maxFileSize) { this.maxFileSize = maxFileSize; }
    },

    getMainSrc: function (repoInfo) {
        return new Promise(function(res) {
            function loop(n) {
                return new Promise(function(resolve, reject) {
                    function onRequest(err, res, body) {
                        if (!err && res.statusCode == 200) {
                            repoInfo[n]["main_src_body"] = body
                            resolve(n + 1);
                        }
                    }
                    if (config.proxy == null || config.proxy == undefined) {
                        request({
                            url: repoInfo[n]["src_raw_url"]
                        }, onRequest);
                    }
                    else{
                        request({
                            tunnel: true,
                            url: repoInfo[n]["src_raw_url"],
                            proxy: 'http://' + config.proxy.username_enc + ":" + config.proxy.password + "@" + config.proxy.server + ":" + config.proxy.port
                        }, onRequest);
                    }
                })
                .then(function(count) {
                    if (count >= repoInfo.length) {
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

    // if there is undefined entry, fake data is used
    validateBlInfo: function (info) {
        var out = info;
        var keys = [
            'author', 'blender', 'category', 'description', 'location', 'name', 'support',
            'tracker_url', 'version', 'warning', 'wiki_url'
        ]
        for (var i = 0; i < keys.length; ++i) {
            var k = keys[i];
            out[k] = out[k] || BL_INFO_UNDEF;
        }

        return out;
    },

    parseMainSrc: function (repoInfoList) {
        var self_ = this;
        return new Promise( (resolve) => {
            // parse bl_info
            for (var i = 0; i < repoInfoList.length; ++i) {
                var blInfoBody = utils.extractBlInfoBody(repoInfoList[i]['main_src_body']);
                if (!blInfoBody) { continue; }      // ignore
                var info = utils.parseBlInfo(blInfoBody);
                if (!info) { continue; }        // ignore
                repoInfoList[i]['bl_info'] = self_.validateBlInfo(info);
            }

            // cleanup
            for (var i = 0; i < repoInfoList.length; ++i) {
                delete repoInfoList[i]['main_src_body'];
            }

            resolve(repoInfoList);
        });
    },

    getRepoURLs: function () {
        var repoURLs = [];
        var self_ = this;
        return new Promise( (res) => {
            function loop(page) {
                return new Promise( (resolve, reject) => {
                    var query = 'bl_info+blender+size:' + self_.minFileSize + '..' + self_.maxFileSize;
                    client.fetch(
                        'https://github.com/search',
                        {
                            q: query,
                            type: 'Code',
                            ref: 'searchresults',
                            p: page
                        },
                        (err, $, res) => {
                            if (err) { throw new Error("Failed to fetch (query=" + query + ", page=" + page + ")") }
                            $('a').each( function(idx)  {
                                var link = $(this).attr('href');
                                // only .py is allowed
                                if (link.slice(-3) == ".py") {
                                    console.log(link);
                                    repoURLs.push(link);
                                }
                            });
                            resolve(page - 1);
                        }
                    );
                })
                .then( (count) => {
                    if (count <= self_.startPage) {
                        var infoList = [];
                        for (var i = 0; i < repoURLs.length; ++i) {
                            var info = {};
                            var repoURL = repoURLs[i];
                            info["url"] = GITHUB_URL + repoURL.slice(0, repoURL.indexOf('/blob/'));
                            info["src_main"] = repoURL.slice(repoURL.lastIndexOf('/') + 1);
                            info["src_url"] = GITHUB_URL + repoURL;
                            info["src_raw_url"] = info["src_url"].replace("github.com/", "raw.githubusercontent.com").replace("blob/", "");
                            info["download_url"] = info["url"] + "/archive/master.zip";
                            var matched = repoURL.match(/\/blob\/[a-zA-z0-9]+\//);
                            var idx = matched['index'];
                            info["src_dir"] = repoURL.slice(idx + matched[0].length - 1);
                            info['repo_name'] = info['url'].slice(info['url'].lastIndexOf('/') + 1);
                            infoList.push(info);
                        }
                        res(infoList);
                    }
                    else {
                        loop(count);
                    }
                });
            }
            loop(self_.endPage);
        });
    },

    buildAddonDB: function () {
        config = this.config;
        client.fetch('https://github.com/login')
            .then(this.loginGitHub.bind(this))
            .then(this.getRepoURLs.bind(this))
            .then(this.getMainSrc)
            .then(this.parseMainSrc.bind(this))
            .then(this.writeDBFile.bind(this))
    },

    // check if GitHub config is valid
    _isGitHubConfigValid: function (config) {
        if (!config) { return false; }
        if (!config.github) { return false; }
        if (!config.github.username) { return false; }
        if (!config.github.password) { return false; }

        return true;
    },

    // login to GitHub
    loginGitHub: function (result) {
        var self_ = this;
        return new Promise( (resolve, reject) => {
            // check login information
            if (!self_._isGitHubConfigValid(self_.config)) { throw new Error("Invalid GitHub configuration"); }
            var loginInfo = {
                login: self_.config.github.username,
                password: self_.config.github.password
            };

            // login to GitHub
            console.log("Login to GitHub as " + loginInfo.login + " ...");
            result.$('form').submit(loginInfo, (err, $, res, body) => {
                if (err) { throw new Error("Failed to login to GitHub"); }
                console.log("Login successfully.");
                resolve();
            });
        });
    },

    writeDBFile: function (repoInfoList) {
        fs.appendFile(this.addonDBFile, JSON.stringify(repoInfoList, null, '  '));
    },

    // write repository's information to database
    writeDB: function (repoInfoList) {
        // generate key for database
        repoInfoList.forEach( (elm) => {
            var name = elm['bl_info']['name'];
            var author = elm['bl_info']['author'];
            var key = utils.genBlAddonKey(name, author);
            elm['key'] = key
        });

        // write to database
        dbWriter.init( () => {
            repoInfoList.forEach( (elm) => {
                var key = {'key': elm['key']};
                try {
                    dbWriter.findOne(key, (err, result) => {
                        if (err) {
                            throw new Error("Failed to process findOne");
                            dbWriter.close();
                        }
                        if (result) {
                            dbWriter.update({'key': elm['key']}, elm, (err) => {
                                if (err) { throw new Error("Failed to update (key=" + elm['key'] + ")"); }
                                console.log("Updated (key=" + elm['key'] + ")");
                                dbWriter.close();
                            });
                        }
                        // not found
                        else {
                            dbWriter.add(elm, (err) => {
                                if (err) { throw new Error("Failed to add (key=" + elm['key'] + ")"); }
                                console.log("Added (key=" + elm['key'] + ")");
                                dbWriter.close();
                            });
                        }
                    }); // dbWriter.findOne
                }
                catch (e) {
                    dbWriter.close();
                    console.log(e);
                }
            }); // this.addonDB.forEach
        }); // dbWriter.init()
    },

    updateDBFile: function (file) {
        this.addonDBFile = file;
        if (utils.isExistFile(file)) {
            fs.unlink(file, (err) => {
                console.log("Removed old add-on database file");
            });
        }

        this.buildAddonDB();

        console.log('Updating DB file ...');
    },

    // read local DB file and return data formatted in JSON
    readDBFile: function (file) {
        if (!utils.isExistFile(file)) { throw new Error('Not found DB file...'); }

        console.log('Reading DB file...');

        var data = fs.readFileSync(file, 'utf8');
        var json = JSON.parse(data);

        return json;
    },

    // check if proxy config is valid
    _isProxyConfigValid: function (config) {
        if (!config) { return false; }
        if (!config.proxy) { return false; }
        if (!config.proxy.username_enc) { return false; }
        if (!config.proxy.password) { return false; }
        if (!config.proxy.server) { return false; }
        if (!config.proxy.port) { return false; }

        return true;
    },

    // get proxy URL
    _getProxyURL: function (config) {
        if (!this._isProxyConfigValid(config)) { return null; }
        var url =
            'http://'
            + config.proxy.username_enc
            + ":"
            + config.proxy.password
            + "@"
            + config.proxy.server
            + ":"
            + config.proxy.port;

        return url;
    },

    // check if API config is valid
    _isAPIConfigValid: function (config) {
        if (!config) { return false; }
        if (!config.db) { return false; }
        if (!config.db.port) { return false; }
        if (!config.db.api) { return false; }
        if (!config.db.endpoint) { return false; }
        if (!config.db.list) { return false; }

        return true;
    },

    // get API URL
    _getAPIURL: function (config) {
        if (!this._isAPIConfigValid(config)) { return null; }
        var url =
            'http://'
            + config.db.server
            + ':'
            + config.db.port
            + config.db.api
            + config.db.endpoint.list
            + '/github';

        return url;
    },

    // fetch add-on information from server, and save to local DB file
    fetchFromDBServer: function (file) {
        var apiURL = this._getAPIURL(this.config);
        if (!apiURL) { throw new Error("Invalid API URL"); }

        // if there is DB file on local, delete it
        this.addonDBFile = file;
        if (utils.isExistFile(this.addonDBFile)) {
            fs.unlink(this.addonDBFile, function (err) {
                console.log("Removed old add-on database file");
            });
        }

        var self_ = this;
        // request callback
        var onRequest = (err, res, body) => {
            if (err) { throw new Error("Failed to fetch data from API.\n" + JSON.stringify(err)); }
            if (res.statusCode != 200) { throw new Error("Failed to fetch data from API. (status=" + res.statusCode + ")"); }

            fs.appendFile(self_.addonDBFile, JSON.stringify(body, null, '  '));
            console.log("Fetched data is saved to " + self_.addonDBFile);
        };

        // send request to api server
        var proxyURL = this._getProxyURL(this.config);
        if (proxyURL) {
            console.log("Use proxy server");
            request({
                tunnel: true,
                url: apiURL,
                json: true,
                proxy: proxyURL
            }, onRequest);
        }
        else {
            console.log("Not use proxy server");
            request({
                url: apiURL,
                json: true,
            }, onRequest);
        }
    }
};

module.exports = blAddonDB;
