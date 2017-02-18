'use strict';

var os = require('os');
var fs = require('fs');
var path = require('path');

var utils = require('nutti_utils');
var blAddon = require('bl-addon');

var blAddonChecker = {
    addonList: {},
    osInfo: {},
    blVers: [],
    loginUser: "",
    pathSeparator: "/",

    init: function () {
    },

    // get OS information
    getOSInfo: function() {
        this.osInfo = {};
        this.pathSeparator = "/";
        console.log("Check Operating System Type ...");
        this.osInfo['type'] = os.type().toString();
        this.osInfo['release'] = os.release().toString();
        this.osInfo['platform'] = os.platform().toString();
        console.log("===Operating System Infomation===");
        console.log(this.osInfo);
        console.log("=================================");

        switch (this.osInfo['type']) {
            case 'Windows_NT':
                this.pathSeparator = "\\";
            case 'Linux':
            case 'Darwin':
                this.pathSeparator = "/";
        }
    },

    // check blender version in user config directory
    checkBlVer: function() {
        var fn = {};

        this.loginUser = "";
        this.blVers = [];

        fn['Windows_NT'] = (self_) => {
            var blUserPath;
            self_.loginUser = process.env['USERPROFILE'].split(path.sep)[2];
            blUserPath = "C:\\Users\\"
                + self_.loginUser
                + "\\AppData\\Roaming\\Blender Foundation\\Blender";
            if (!utils.isDirectory(blUserPath)) { return; }
            self_.blVers = fs.readdirSync(blUserPath);
            self_.blVers = self_.blVers.filter( (dir) => {
                var isDir = utils.isDirectory(blUserPath + '\\'+ dir);
                var isVersionDir = /[0-9]\.[0-9]{2}$/.test(dir);
                return isDir && isVersionDir;
            });
        };

        fn['Linux'] = (self_) => {
            var blUserPath;
            self_.loginUser = process.env['USER'];
            blUserPath = "/home/"
                + self_.loginUser
                + "/.config/blender";
            if (!utils.isDirectory(blUserPath)) { return; }
            self_.blVers = fs.readdirSync(blUserPath);
            self_.blVers = self_.blVers.filter( (dir) => {
                var isDir = utils.isDirectory(blUserPath + "/" + dir);
                var isVersionDir = /[0-9]\.[0-9]{2}$/.test(dir);
                return isDir && isVersionDir;
            });
        };

        fn['Darwin'] = (self_) => {
            var blUserPath;
            self_.loginUser = process.env['USER'];
            blUserPath = "/Users/"
                + self_.loginUser
                + "/Library/Application Support/Blender";
            if (!utils.isDirectory(blUserPath)) { return; }
            self_.blVers = fs.readdirSync(blUserPath);
            self_.blVers = self_.blVers.filter( (dir) => {
                var isDir = utils.isDirectory(blUserPath + "/" + dir);
                var isVersionDir = /[0-9]\.[0-9]{2}$/.test(dir);
                return isDir && isVersionDir;
            });
        };


        if (fn[this.osInfo['type']]) {
            fn[this.osInfo['type']](this);
        }
        else {
            throw new Error("Unknown operating system");
        }
    },

    // make add-on path from OS type, username, blender version
    makeAddonPath: function(osType, user, blVer) {
        var scriptPath = this.makeScriptPath(osType, user, blVer);
        if (!scriptPath) {
            return null;
        }

        return scriptPath + this.pathSeparator + "addons";
    },

    // make script path from OS type, username, blender version
    makeScriptPath: function(osType, user, blVer) {
        switch (osType) {
            case 'Windows_NT':
                return "C:\\Users\\" + user + "\\AppData\\Roaming\\Blender Foundation\\Blender\\" + blVer + "\\scripts";
            case 'Linux':
                return "/home/" + user + "/.config/blender/" + blVer + "/scripts";
            case 'Darwin':
                return "/Users/" + user + "/Library/Application Support/Blender/" + blVer + "/scripts";
        }

        return null;
    },

    // get installed add-on name
    getInstalledAddonName: function() {
        this.adonList = {};

        for (var i = 0; i < this.blVers.length; ++i) {
            var version = this.blVers[i];
            var scriptPath = this.makeAddonPath(this.osInfo['type'], this.loginUser, version);
            if (!scriptPath) { throw new Error("Failed to get script path"); }
            if (!utils.isDirectory(scriptPath)) { continue; }
            var list = fs.readdirSync(scriptPath);
            list = list.filter( (e) => {
                return e != "__pycache__";
            });
            if (list.length == 0) { continue; }
            this.addonList[version] = [];
            for (var l = 0; l < list.length; ++l) {
                this.addonList[version].push({'name': list[l]});
            }
        }
    },

    // get bl_info
    getBlInfo: function() {
        for (var key in this.addonList) {
            var addonPath = this.makeAddonPath(this.osInfo['type'], this.loginUser, key);
            if (!addonPath) { throw new Error("Failed to get add-on path"); }
            for (var i in this.addonList[key]) {
                var path = addonPath + this.pathSeparator + this.addonList[key][i]['name'];
                var mainSrcPath = path;
                if (utils.isDirectory(path)) {
                    var list = fs.readdirSync(path);
                    while (list.length > 0) {
                        if (list.indexOf("__init__.py") >= 0) {
                            mainSrcPath += this.pathSeparator + "__init__.py";
                            break;
                        }
                        else {
                            mainSrcPath += list[0];
                        }
                    }
                }
                var srcBody = fs.readFileSync(mainSrcPath).toString();
                if (!utils.isExistFile(mainSrcPath)) { throw new Error("File '" + mainSrcPath + "' does not exist"); }
                var blInfoBody = utils.extractBlInfoBody(srcBody);
                if (!blInfoBody) { continue; }      // ignore
                var info = utils.parseBlInfo(blInfoBody);
                if (!info) { continue; }            // ignore
                this.addonList[key][i]['bl_info'] = blAddon.validateBlInfo(info);
                this.addonList[key][i]['main_src_path'] = mainSrcPath;
                this.addonList[key][i]['src_path'] = path;

                // cleanup
                delete this.addonList[key][i]['name'];
            }
            // cleanup
            this.addonList[key] = this.addonList[key].filter( (elm) => {
                return elm['bl_info'] != undefined;
            });
        }
    },

    // check installed blender add-on
    checkInstalledBlAddon: function () {
        this.getOSInfo();
        this.checkBlVer();
        this.getInstalledAddonName();
        this.getBlInfo();
    },

    getAddonPath: function (blVer) {
        this.getOSInfo();
        this.checkBlVer();

        var scriptPath = this.makeAddonPath(this.osInfo['type'], this.loginUser, blVer);
        if (!scriptPath) { return null; }
        if (!utils.isDirectory(scriptPath)) { return null; }

        return scriptPath;
    },

    createAddonDir: function (blVer) {
        this.getOSInfo();
        this.checkBlVer();

        var scriptPath = this.makeScriptPath(this.osInfo['type'], this.loginUser, blVer);
        var addonPath = this.makeAddonPath(this.osInfo['type'], this.loginUser, blVer);
        if (!scriptPath) { throw new Error("Failed to create " + scriptPath); }
        if (!utils.isDirectory(scriptPath)) {
            if (utils.isExistFile(scriptPath)) { throw new Error(scriptPath + " is already exist"); }
            fs.mkdirSync(scriptPath);
        }
        if (!utils.isDirectory(addonPath)) {
            if (utils.isExistFile(addonPath)) { throw new Error(addonPath + " is already exist"); }
            fs.mkdirSync(addonPath);
        }
    },

    getPathSeparator: function () {
        return this.pathSeparator;
    },

    saveTo: function (file) {
        fs.writeFileSync(file, JSON.stringify(this.addonList, null, '  '));
    },
};

module.exports = blAddonChecker;
