'use strict';

var os = require('os');
var fs = require('fs');
var path = require('path');

var utils = require('nutti_utils');

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
                this.pathSeparator = "/";
        }
    },

    // check blender version in user config directory
    checkBlVer: function() {
        var fn = {};

        fn['Windows_NT'] = (self_) => {
            var blUserPath;
            self_.loginUser = process.env['USERPROFILE'].split(path.sep)[2];
            blUserPath = "C:\\Users\\"
                + self_.loginUser
                + "\\AppData\\Roaming\\Blender Foundation\\Blender\\";
            if (!utils.isDirectory(blUserPath)) { return; }
            self_.blVers = fs.readdirSync(blUserPath);
            self_.blVers = self_.blVers.filter( (dir) => {
                var isDir = utils.isDirectory(blUserPath + dir);
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


        if (fn[this.osInfo['type']]) {
            fn[this.osInfo['type']](this);
        }
        else {
            throw new Error("Unknown operating system");
        }
    },

    // make add-on path from OS type, username, blender version
    makeAddonPath: function(osType, user, blVer) {
        switch (osType) {
            case 'Windows_NT': 
                return "C:\\Users\\" + user + "\\AppData\\Roaming\\Blender Foundation\\Blender\\" + blVer + "\\scripts\\addons";
            case 'Linux':
                return "/home/" + user + "/.config/blender/" + blVer + "/scripts/addons";
        }

        return null;
    },

    // get installed add-on name
    getInstalledAddonName: function() {
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

    // [TODO] same function is located on bl_add-on_db.js
    validateBlInfo: function (info) {
        var BL_INFO_UNDEF = "626c5f696e666f5f@UNDEF";
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
                this.addonList[key][i]['bl_info'] = this.validateBlInfo(info);
                this.addonList[key][i]['main_src_path'] = mainSrcPath;
                this.addonList[key][i]['src_path'] = path;

                // cleanup
                delete this.addonList[key][i]['name'];
            }
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
        if (!scriptPath) {return null; }
        if (!utils.isDirectory(scriptPath)) { return null; }

        return scriptPath;
    },

    saveTo: function (file) {
        fs.writeFileSync(file, JSON.stringify(this.addonList, null, '  '));
    },
};

module.exports = blAddonChecker;
