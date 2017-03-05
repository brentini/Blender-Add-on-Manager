'use strict';

// external modules
var fs = require('fs');
var client = require('cheerio-httpcli');
var https = require('https');
var request = require('request');

// own modules
var utils = require('nutti_utils');
var blAddon = require('bl-addon');

var GITHUB_URL = 'https://github.com/';

var blAddonDB = {
    config: null,
    addonDB: {},
    addonDBFile: "",
    startPage: 0,
    endPage: 1,
    minFileSize: 0,
    maxFileSize: 1000,
    db: null,

    // initialize
    init: function (config, startPage, endPage, minFileSize, maxFileSize) {
        if (config) { this.config = config; }
        if (startPage) { this.startPage = startPage; }
        if (endPage) { this.endPage = endPage; }
        if (minFileSize) { this.minFileSize = minFileSize; }
        if (maxFileSize) { this.maxFileSize = maxFileSize; }
        this.addonDB = {};
        this.addonDBFile = "";
        this.db = null;
    },

    fini: function () {
    },

    // fetch add-on's main source from GitHub
    getMainSrc: function (repoInfo) {
        var self_ = this;
        return new Promise( (res) => {
            function loop(n) {
                return new Promise( (resolve) => {
                    function onRequest(err, response, body) {
                        if (err) { throw new Error("Failed to fetch data from API (err=" + JSON.stringify(err) + ", url=" + repoInfo[n]["src_raw_url"] + ")" ); }
                        if (response.statusCode != 200) { throw new Error("Failed to fetch data from API. (status=" + response.statusCode + ")"); }
                        repoInfo[n]["main_src_body"] = body;
                        resolve(n + 1);
                    }
                    var proxyURL = self_._getProxyURL(self_.config);
                    if (proxyURL) {
                        request({
                            tunnel: true,
                            url: repoInfo[n]["src_raw_url"],
                            proxy: proxyURL
                        }, onRequest);
                    }
                    else{
                        request({ url: repoInfo[n]["src_raw_url"] }, onRequest);
                    }
                }) // return new Promise
                .then(function(count) {
                    if (count >= repoInfo.length) {
                        res(repoInfo);
                    }
                    else {
                        loop(count);
                    }
                }); //.then
            } // function loop
            loop(0);
        }); // reutrn new Promise
    },

    // parse add-on's main source
    parseMainSrc: function (repoInfoList) {
        var self_ = this;
        return new Promise( (resolve) => {
            // parse bl_info
            for (var i = 0; i < repoInfoList.length; ++i) {
                var blInfoBody = utils.extractBlInfoBody(repoInfoList[i]['main_src_body']);
                if (!blInfoBody) { continue; }      // ignore
                var info = utils.parseBlInfo(blInfoBody);
                if (!info) { continue; }            // ignore
                repoInfoList[i]['bl_info'] = blAddon.validateBlInfo(info);
            }

            // cleanup
            repoInfoList = repoInfoList.filter( (elm) => {
                return elm['bl_info'] != undefined;
            });
            for (var i = 0; i < repoInfoList.length; ++i) {
                delete repoInfoList[i]['main_src_body'];
            }

            resolve(repoInfoList);
        });
    },

    // get URL repository located
    getRepoURLs: function () {
        var repoURLs = [];
        var self_ = this;
        return new Promise( (res) => {
            function loop(page) {
                return new Promise( (resolve) => {
                    // fetch search result
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
                                    repoURLs.push(link);
                                }
                            });
                            resolve(page - 1);
                        }
                    );
                })
                .then( (count) => {
                    // loop is over, then build repository's information
                    if (count < self_.startPage) {
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
                            if (!matched) { throw new Error("Does not match blob"); }
                            var idx = matched['index'];
                            info["src_dir"] = repoURL.slice(idx + matched[0].length - 1);
                            info['repo_name'] = info['url'].slice(info['url'].lastIndexOf('/') + 1);
                            infoList.push(info);
                        }
                        res(infoList);
                    }
                    // next page
                    else {
                        loop(count);
                    }
                }); // .then
            } // function loop()
            loop(self_.endPage);    // first loop
        }); // return new Promise
    },

    buildAddonDB: function () {
        client.fetch('https://github.com/login')
            .then(this.loginGitHub.bind(this))
            .then(this.getRepoURLs.bind(this))
            .then(this.getMainSrc.bind(this))
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
    _sendReqToDB: function (repoInfoList) {
        var dbWriter = this.db;
        if (!dbWriter) { throw new Error("DB is not registered"); }
        if (!dbWriter.connected()) {
            throw new Error("DB Writer is not connected. Data will be lost");
            return;
        }

        // generate key for database
        repoInfoList.forEach( (elm) => {
            var name = elm['bl_info']['name'];
            var author = elm['bl_info']['author'];
            var key = utils.genBlAddonKey(name, author);
            elm['key'] = key
        });

        // remove duplicate
        var tmpList = {};
        for (var i = 0; i < repoInfoList.length; ++i) {
            var elm = repoInfoList[i];
            var key = elm['key'];
            var version = elm['bl_info']['version'];
            if (!tmpList[key]) {
                tmpList[key] = [];
            }
            tmpList[key].push(elm);
        }
        var noDupli = [];
        for (var key in tmpList) {
            var elms = tmpList[key];
            var newest = elms[0];
            for (var i = 1; i < elms.length; ++i) {
                var ver1 = newest['bl_info']['version'];
                var ver2 = elms[i]['bl_info']['version'];
                if (blAddon.compareAddonVersion(ver1, ver2) == -1) { // ver1 < ver2
                    newest = elms[i];
                }
            }
            noDupli.push(newest);
        }

        
        // write to database
        noDupli.forEach( (elm) => {
            var key = {'key': elm['key']};
            try {
                dbWriter.findOne(key, (err, result) => {
                    if (err) {
                        throw new Error("Failed to process findOne");
                    }
                    if (result) {
                        var ver1 = result['bl_info']['version'];
                        var ver2 = elm['bl_info']['version'];
                        if (blAddon.compareAddonVersion(ver1, ver2) >= 0) {    // ver1 >= ver2
                            console.log("No need to updated (key=" + elm['key'] + ")");
                            return;
                        }
                        dbWriter.update({'key': elm['key']}, elm, (err) => {
                            if (err) { throw new Error("Failed to update (key=" + elm['key'] + ", err=" + err + ")"); }
                            console.log("Updated (key=" + elm['key'] + ")");
                        });
                    }
                    // not found
                    else {
                        dbWriter.add(elm, (err) => {
                            if (err) { throw new Error("Failed to add (key=" + elm['key'] + ")"); }
                            console.log("Added (key=" + elm['key'] + ")");
                        });
                    }
                }); // dbWriter.findOne
            }
            catch (e) {
                console.log(e);
            }
        }); // noDupli.forEach
    },

    writeDB: function(db) {
        this.db = db;
        client.fetch('https://github.com/login')
            .then(this.loginGitHub.bind(this))
            .then(this.getRepoURLs.bind(this))
            .then(this.getMainSrc.bind(this))
            .then(this.parseMainSrc.bind(this))
            .then(this._sendReqToDB.bind(this))
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
        if (!config.db.endpoint.list) { return false; }

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
            fs.unlinkSync(this.addonDBFile);
            console.log("Removed old add-on database file");
        }

        var self_ = this;
        // request callback
        var onRequest = (err, res, body) => {
            if (err) { throw new Error("Failed to fetch data from API.\n" + JSON.stringify(err)); }
            if (res.statusCode != 200) { throw new Error("Failed to fetch data from API. (status=" + res.statusCode + ")"); }

            fs.appendFileSync(self_.addonDBFile, JSON.stringify(body, null, '  '));
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
