'use strict';

var fs = require('fs');
var builder = require('bl_add-on_db');
var checker = require('bl_add-on_checker');
var path = require('path');
var del = require('del');

var utils = require('nutti_utils');


var GITHUB_ADDONS_DB = path.resolve('./db/add-on_list.db');
var INSTALLED_ADDONS_DB = path.resolve('./db/installed_add-on_list.db');

var githubAddons = null;
var installedAddons = null;

var config = null;

var app = angular.module('readus', [])

function updateAddonStatus(github, installed, blVer) {
    var addonStatus = {};

    for (var i = 0; i < github.length; ++i) {
        for (var j = 0; j < installed[blVer].length; ++j) {
            if (github[i]['bl_info']['name'] == installed[j]['bl_info']['name']) {
                console.log(github[i]['bl_info']['name']);
            }
        }
    }
}


app.controller('MainController', function ($scope, $timeout) {
    var main = this;
    main.repoList = [];


    $timeout(function() {
        main.repoList = githubAddons;
    });

    $scope.blVerList = ['2.75', '2.76', '2.77', '2.78'];
    $scope.blVerSelect = $scope.blVerList[0];
    $scope.showBlVerSelect = true;

    $scope.addonCategories = [
        {id: 1, name: 'All', value: 'All'},
        {id: 2, name: '3D View', value: '3D View'},
        {id: 3, name: 'Add Curve', value: 'Add Curve'},
        {id: 4, name: 'Add Mesh', value: 'Add Mesh'},
        {id: 5, name: 'Animation', value: 'Animation'},
        {id: 6, name: 'Development', value: 'Development'},
        {id: 7, name: 'Game Engine', value: 'Game Engine'},
        {id: 8, name: 'Import-Export', value: 'Import-Export'},
        {id: 9, name: 'Material', value: 'Material'},
        {id: 10, name: 'Mesh', value: 'Mesh'},
        {id: 11, name: 'Node', value: 'Node'},
        {id: 12, name: 'Object', value: 'Object'},
        {id: 13, name: 'Paint', value: 'Paint'},
        {id: 14, name: 'Pie Menu', value: 'Pie Menu'},
        {id: 15, name: 'Render', value: 'Render'},
        {id: 16, name: 'Rigging', value: 'Rigging'},
        {id: 17, name: 'System', value: 'System'},
        {id: 18, name: 'UI', value: 'UI'},
        {id: 19, name: 'UV', value: 'UV'}
    ];
    $scope.addonSupportedLevels = [
        {id: 1, name: 'Official'},
        {id: 2, name: 'Contrib'},
        {id: 3, name: 'External'}
    ];
    $scope.addonLists = [
        {id: 1, name: 'Installed', value: 'installed'},
        {id: 2, name: 'GitHub', value: 'github'},
        {id: 3, name: 'Update', value: 'update'}
    ];
    
    $scope.onAddonSelectorChanged = onAddonSelectorChanged;

    $('#update-github-addon-db').click(function (e) {
        updateGitHubAddonDB();
    });

    $('#update-installed-addon-db').click(function (e) {
        updateInstalledAddonDB();
    });


    function updateGitHubAddonDB() {
        builder.init(config);
        builder.updateDBFile(GITHUB_ADDONS_DB);
        loadGitHubAddonDB();
    }

    function updateInstalledAddonDB() {
        checker.init();
        checker.checkInstalledBlAddon();
        checker.saveTo(INSTALLED_ADDONS_DB);
        loadInstalledAddonsDB();
    }

    function filterAddons(addons, category, support) {
        return addons.filter(function(elm, idx, arr) {
            var categoryMatched = (category == 'All') || (elm['bl_info']['category'] == category);
            return categoryMatched;
        });
    }

    function onAddonSelectorChanged() {
        var list = $scope.addonList;
        var blVer = $scope.blVerSelect;
        var category = $scope.category;
        var support = [];
        var addons = [];

        switch (list) {
            case 'installed':
                console.log("Show Installed add-on list");
                if (blVer != '') {
                    if (installedAddons[blVer] != undefined) {
                        addons = filterAddons(installedAddons[blVer], category, support);
                    }
                }
                break;
            case 'github':
                console.log("Show GitHub add-on list");
                addons = filterAddons(githubAddons, category, support);
                break;
            case 'update':
                console.log("Show Updatable add-on list");
                break;
            default:
                break;
        }

        main.repoList = addons;
        $timeout(function() {
            var dlBtnList = $('.download');
            dlBtnList.click(function (ev) {
                var repoIndex = $(ev.target).data('repo-index');
                console.log("Downloding add-on '" + githubAddons[repoIndex]['bl_info']['name'] + "' from " + githubAddons[repoIndex]['download_url']);
                var target = checker.getAddonPath($scope.blVerSelect);
                if (target == null) { return; }
                var downloadTo = target + "/" + githubAddons[repoIndex]['bl_info']['name'] + ".zip";
                console.log("Save to " + target + " ...");
                utils.downloadAndExtract(
                    githubAddons[repoIndex]['download_url'], config, downloadTo, target, updateInstalledAddonDB);
            });

            var rmBtnList = $('.remove');
            rmBtnList.click(function(ev) {
                var repoIndex = $(ev.target).data('repo-index');
                var target = checker.getAddonPath($scope.blVerSelect);
                if (target == null) { return; }
                var deleteFrom = installedAddons[blVer][repoIndex]['src_path'];
                console.log("Delete " + deleteFrom + " ...");
                var result = del.sync([deleteFrom], {force: true});
                console.log(result);
                updateInstalledAddonDB();
                //fs.unlink(deleteFrom);
            });
        });
    }

});

function loadGitHubAddonDB() {
    if (utils.isExistFile(GITHUB_ADDONS_DB)) {
        console.log("Loading GitHub add-ons DB file ...")
        githubAddons = builder.readDBFile(GITHUB_ADDONS_DB);
    }
}

function loadInstalledAddonsDB() {
    if (utils.isExistFile(INSTALLED_ADDONS_DB)) {
        console.log("Loading installed add-ons DB file ...");
        installedAddons = builder.readDBFile(INSTALLED_ADDONS_DB);
    }
}

loadGitHubAddonDB();
loadInstalledAddonsDB();

fs.readFile('config.json', 'utf8', function (err, text) {
    console.log("Parsing configuration file ...");
    config = JSON.parse(text);
    console.log("Parsed configuration file ...");
});

