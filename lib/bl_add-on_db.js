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

    validateBlInfo: (info) => {
        var out = info;
        var keys = [
            'author', 'blender', 'category', 'description', 'location', 'name', 'support',
            'tracker_url', 'version', 'warning', 'wiki_url'
        ]
        for (var i = 0; i < keys.length; ++i) {
            var k = keys[i];
            out[k] = out[k] || BL_INFO_UNDEF;
        }
    },

    parseMainSrc: function (repoInfoList) {
        for (var i = 0; i < repoInfoList.length; ++i) {
            var blInfoBody = utils.extractBlInfoBody(repoInfoList[i]["main_src_body"]);
            if (!blInfoBody) { continue; }      // ignore
            var info = utils.parseBlInfo(blInfoBody);
            if (!info) { continue; }        // ignore
            repoInfoList[i]["bl_info"] = info;
        }

        this.addonDB = repoInfoList.filter(function (v) {
            return v["bl_info"];
        });
        for (var i = 0; i < this.addonDB.length; ++i) {
            delete this.addonDB[i]["main_src_body"];
        }
        //this.writeDB();
        this.writeDBFile();
    },

    getRepoURLs: function () {
        var repoURLs = [];
        var obj = this;
        return new Promise(function(res) {
            function loop(page) {
                console.log(page);
                return new Promise(function(resolve, reject) {
                    var query = 'bl_info+blender+size:' + obj.minFileSize + '..' + obj.maxFileSize;
                    console.log(query);
                    client.fetch(
                        'https://github.com/search',
                        {
                            q: query,
                            type: 'Code',
                            ref: 'searchresults',
                            p: page
                        },
                        function(err, $, res) {
                            $('a').each(function(idx) {
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
                .then(function(count) {
                    if (count <= obj.startPage) {
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
            loop(obj.endPage);
        });
    },

    buildAddonDB: function () {
        config = this.config;
        client.fetch('https://github.com/login')
            .then(this.loginGitHub)
            .then(this.getRepoURLs.bind(this))
            .then(this.getMainSrc)
            .then(this.parseMainSrc.bind(this))
    },

    // check if GitHub config is valid
    _isGitHubConfigValid: (config) => {
        console.log("test");
        if (!config) { return false; }
        if (!config.github) { return false; }
        if (!config.github.username) { return false; }
        if (!config.github.password) { return false; }

        return true;
    },

    errorMessage: (msg) => {
        console.log(msg);
    },

    loginGitHub: (result) => {
        return new Promise( (resolve, reject) => {
            if (!self_._isGitHubConfigValid(self_.config)) { console.log("tt"); reject("Invalid GitHub config"); }
            var loginInfo = {
                login: self_.config.github.username,
                password: self_.config.github.password
            };
            console.log("Login to GitHub as " + loginInfo.login + " ...");
            result.$('form').submit(loginInfo, (err, $, res, body) => {
                console.log("Login successfully.");
                resolve();
            });
        });
    },

    writeDBFile: function () {
        fs.appendFile(this.addonDBFile, JSON.stringify(this.addonDB, null, '  '));
    },

    writeDB: function () {
        this.addonDB.forEach( (elm) => {
            var name = elm['bl_info']['name'] || '';
            var author = elm['bl_info']['author'] || '';
            var key = utils.genBlAddonKey(name, author);
            elm['key'] = key
        });
        dbWriter.init( () => {
            this.addonDB.forEach( (elm) => {
                var key = {'key': elm['key']};
                dbWriter.findOne(key, (err, result) => {
                    // not found
                    if (err) {
                        console.log("Error.");
                        dbWriter.close();
                    }
                    // found
                    else if (result) {
                        console.log("Found");
                        dbWriter.update({'key': elm['key']}, elm, (err) => {
                            if (err) { console.log("Failed to add"); }
                            else { console.log("OK: update"); }
                            dbWriter.close();
                        });
                    }
                    // not found
                    else {
                        console.log("Not Found");
                        dbWriter.add(elm, (err) => {
                            if (err) { console.log("Failed to add"); }
                            else { console.log("OK: add"); }
                            dbWriter.close();
                        });
                    }
                }); // dbWriter.findOne
            }); // this.addonDB.forEach
        }); // dbWriter.init()
    },

    updateDBFile: function (file) {
        this.addonDBFile = file;
        if (utils.isExistFile(file)) {
            fs.unlink(file, function (err) {
                console.log("Removed old add-on database file");
            });
        }

        this.buildAddonDB();

        console.log('Updating DB file ...');
    },

    // read local DB file and return data formatted in JSON
    readDBFile: (file) => {
        if (!utils.isExistFile(file)) { console.log('Not found DB file...'); return null; }

        console.log('Reading DB file...');

        var data = fs.readFileSync(file, 'utf8');
        var json = JSON.parse(data);

        return json;
    },

    // check if proxy config is valid
    _isProxyConfigValid: (config) => {
        if (!config) { return false; }
        if (!config.proxy) { return false; }
        if (!config.proxy.username_enc) { return false; }
        if (!config.proxy.password) { return false; }
        if (!config.proxy.server) { return false; }
        if (!config.proxy.port) { return false; }

        return true;
    },

    // get proxy URL
    _getProxyURL: (config) => {
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
    _isAPIConfigValid: (config) => {
        if (!config) { return false; }
        if (!config.db) { return false; }
        if (!config.db.port) { return false; }
        if (!config.db.api) { return false; }
        if (!config.db.endpoint) { return false; }
        if (!config.db.list) { return false; }

        return true;
    },

    // get API URL
    _getAPIURL: (config) => {
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
    fetchFromDBServer: (file) => {
        var apiURL = this._getAPIURL(this.config);
        if (!apiURL) { console.log("Invalid API URL"); return; }

        // if there is DB file on local, delete it
        this.addonDBFile = file;
        if (utils.isExistFile(this.addonDBFile)) {
            fs.unlink(this.addonDBFile, function (err) {
                console.log("Removed old add-on database file");
            });
        }

        var self = this;
        // request callback
        var onRequest = (err, res, body) => {
            if (err) { console.log(err); return; }
            if (res.statusCode != 200) { console.log(res.statusCode); return; }

            fs.appendFile(self.addonDBFile, JSON.stringify(body, null, '  '));
            console.log("Fetched data is saved to " + this.addonDBFile);
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
