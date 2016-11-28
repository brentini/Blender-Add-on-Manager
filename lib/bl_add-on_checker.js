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

    init: function () {
    },

    getOSInfo: function() {
        console.log("Check Operating System Type ...");
        this.osInfo['type'] = os.type().toString();
        this.osInfo['release'] = os.release().toString();
        this.osInfo['platform'] = os.platform().toString();
        console.log("===Operating System Infomation===");
        console.log(this.osInfo);
        console.log("=================================");
    },

    checkBlVer: function() {
        if (this.osInfo['type'] == "Windows_NT") {
            var blUserPath;
            this.loginUser = process.env['USERPROFILE'].split(path.sep)[2];
            blUserPath = "C:\\Users\\" + this.loginUser + "\\AppData\\Roaming\\Blender Foundation\\Blender\\";
            this.blVers = fs.readdirSync(blUserPath);
        }
    },

    makeAddonPath: function(osType, user, blVer) {
        if (osType == "Windows_NT") {
            return "C:\\Users\\" + user + "\\AppData\\Roaming\\Blender Foundation\\Blender\\" + blVer + "\\scripts\\addons";
        }
    },

    getInstalledAddonName: function() {
        for (var i = 0; i < this.blVers.length; ++i) {
            var elm = this.blVers[i];
            var scriptPath = this.makeAddonPath(this.osInfo['type'], this.loginUser, elm);
            if (!utils.isExistFile(scriptPath)) { continue; }
            var list = fs.readdirSync(scriptPath);
            list = list.filter(function (e) {
                return e != "__pycache__";
            });
            if (list.length == 0) { continue; }
            this.addonList[elm] = [];
            for (var i = 0; i < list.length; ++i) {
                this.addonList[elm].push({'name': list[i]});
            }
        }
    },

    getBlInfo: function() {
        for (var key in this.addonList) {
            var addonPath = this.makeAddonPath(this.osInfo['type'], this.loginUser, key);
            for (var i in this.addonList[key]) {
                var path = addonPath + "\\" + this.addonList[key][i]['name'];
                var mainSrcPath = path;
                if (utils.isDirectory(path)) {
                    var list = fs.readdirSync(path);
                    if (list.indexOf("__init__.py") >= 0) {
                        mainSrcPath += "\\__init__.py";
                    }
                    else {
                        mainSrcPath += list[0];
                    }
                }
                var srcBody = fs.readFileSync(mainSrcPath).toString();
                var blInfoBody = utils.extractBlInfoBody(srcBody);
                var info = utils.extractBlInfo(blInfoBody);
                if (info == null) { continue; }
                this.addonList[key][i]['bl_info'] = info;
                this.addonList[key][i]['main_src_path'] = mainSrcPath;
                delete this.addonList[key][i]['name'];
                console.log(info);
            }
        }
    },

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
        if (!utils.isExistFile(scriptPath)) { return null; }

        return scriptPath;
    },

    saveTo: function (file) {
        fs.writeFileSync(file, JSON.stringify(this.addonList, null, '  '));
    },
};

module.exports = blAddonChecker;
