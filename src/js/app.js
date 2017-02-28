'use strict';

var fs = require('fs');
var fsext = require('fs-extra');
var path = require('path');
var del = require('del');

var builder = require('bl_add-on_db');
var checker = require('bl_add-on_checker');
var utils = require('nutti_utils');


var GITHUB_ADDONS_DB = path.resolve('./db/add-on_list.db');
var INSTALLED_ADDONS_DB = path.resolve('./db/installed_add-on_list.db');

var githubAddons = null;
var installedAddons = null;

var config = null;

var app = angular.module('readus', [])

var downloadList = [];

app.controller('MainController', function ($scope, $timeout) {
    checker.init();
    $scope.blVerList = checker.getInstalledBlVers();
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
    $scope.addonLists = [
        {id: 1, name: 'Installed', value: 'installed'},
        {id: 2, name: 'GitHub', value: 'github'},
        {id: 3, name: 'Update', value: 'update'}
    ];

    loadGitHubAddonDB();
    loadInstalledAddonsDB();
    $scope.addonStatus = updateAddonStatus(githubAddons, installedAddons, $scope.blVerList);

    fs.readFile('config.json', 'utf8', function (err, text) {
        console.log("Parsing configuration file ...");
        config = JSON.parse(text);
        console.log("Parsed configuration file ...");
    });


    var main = this;
    main.repoList = [];

    $scope.blVerSelect = $scope.blVerList[0];
    $scope.showBlVerSelect = true;


    $scope.onAddonSelectorChanged = onAddonSelectorChanged;

    $('#update-github-addon-db').click(function (e) {
        updateGitHubAddonDB();
    });

    $('#update-installed-addon-db').click(function (e) {
        updateInstalledAddonDB();
    });


    function updateGitHubAddonDB() {
        builder.init(config);
        builder.fetchFromDBServer(GITHUB_ADDONS_DB);
        loadGitHubAddonDB();
        $scope.addonStatus = updateAddonStatus(githubAddons, installedAddons, $scope.blVerList);
        onAddonSelectorChanged();
    }

    function updateInstalledAddonDB() {
        checker.init();
        checker.checkInstalledBlAddon();
        checker.saveTo(INSTALLED_ADDONS_DB);
        loadInstalledAddonsDB();
        $scope.addonStatus = updateAddonStatus(githubAddons, installedAddons, $scope.blVerList);
        onAddonSelectorChanged();
    }


    $scope.isAddonListActive = function (index) {
        if ($scope.addonListActive == undefined) {
            $scope.onAddonListSelectorChanged(0);
        }
        return $scope.addonListActive == index;
    };

    $scope.isAddonCategoryActive = function (index) {
        if ($scope.addonCategoryActive == undefined) {
            $scope.onAddonCategorySelectorChanged(0);
        }
        return $scope.addonCategoryActive[index];
    };

    $scope.onAddonListSelectorChanged = function (index) {
        $scope.activeAddonList = $scope.addonLists[index].value;
        $scope.addonListActive = index;
        onAddonSelectorChanged();
    };

    $scope.onAddonCategorySelectorChanged = function (index) {
        if ($scope.addonCategoryActive == undefined) {
            $scope.addonCategoryActive = Array.apply(null, Array($scope.addonCategories.length)).map(() => {return false});
        }
        $scope.addonCategoryActive[index] = !$scope.addonCategoryActive[index];
        onAddonSelectorChanged();
    };

    $scope.onSearchBarUpdated = (event) => {
        $scope.searchStr = event.target.value;
        onAddonSelectorChanged();
    };

    $scope.isRmBtnLocked = false;
    $scope.isDlBtnLocked = false;
    $scope.isUpBtnLocked = false;

    $scope.getAddonStatus = function (key) {
        return $scope.addonStatus[key]['status'][$scope.blVerSelect];
    };

    function onAddonSelectorChanged() {
        // collect filter condition
        var activeList = $scope.addonLists[$scope.addonListActive]['value'];
        var blVer = $scope.blVerSelect;
        var activeCategory = [];
        if ($scope.addonCategoryActive != undefined) {
            var idx = $scope.addonCategoryActive.indexOf(true);
            while (idx != -1) {
                activeCategory.push($scope.addonCategories[idx]['value']);
                idx = $scope.addonCategoryActive.indexOf(true, idx + 1);
            }
        }
        var searchStr = $scope.searchStr;

        // update add-on info
        var addons = [];
        switch (activeList) {
            case 'installed':
                console.log("Show Installed add-on list");
                if ($scope.addonStatus) {
                    addons = filterAddons(
                        $scope.addonStatus,
                        'installed',
                        ['INSTALLED', 'UPDATABLE'],
                        blVer,
                        activeCategory,
                        searchStr);
                }
                $scope.addonInfoTpl = 'partials/addon-info/installed.html';
                break;
            case 'github':
                console.log("Show GitHub add-on list");
                if ($scope.addonStatus) {
                    addons = filterAddons(
                        $scope.addonStatus,
                        'github',
                        ['INSTALLED', 'NOT_INSTALLED', 'UPDATABLE'],
                        blVer,
                        activeCategory,
                        searchStr);
                }
                $scope.addonInfoTpl = 'partials/addon-info/github.html';
                break;
            case 'update':
                console.log("Show Updatable add-on list");
                if ($scope.addonStatus) {
                    addons = filterAddons(
                        $scope.addonStatus,
                        'installed',
                        ['UPDATABLE'],
                        blVer,
                        activeCategory,
                        searchStr);
                }
                $scope.addonInfoTpl = 'partials/addon-info/update.html';
                break;
            default:
                return;
        }
        main.repoList = addons;

        function onDlBtnClicked($event) {
            var repoIndex = $($event.target).data('repo-index');
            var repo = $scope.addonStatus[main.repoList[repoIndex]]['github'];

            // lock "Download" button
            $scope.isDlBtnLocked = true;

            console.log("Downloding add-on '" + repo['bl_info']['name'] + "' from " + repo['download_url']);
            var target = checker.getAddonPath($scope.blVerSelect);
            if (target == null) {
                // try to make add-on dir.
                checker.createAddonDir($scope.blVerSelect);
                target = checker.getAddonPath($scope.blVerSelect);
                if (target == null) { throw new Error("Failed to make add-on directory"); }
            }

            // download and extract add-on
            var downloadTo = target + checker.getPathSeparator() + repo['bl_info']['name'] + ".zip";
            console.log("Save to " + downloadTo + " ...");
            utils.downloadAndExtract(
                repo['download_url'], config, downloadTo, target, onCompleteExtract);

            function onCompleteExtract() {
                var target = checker.getAddonPath($scope.blVerSelect);
                var extractedPath = target + checker.getPathSeparator() + repo['repo_name'] + '-master';
                var sp = repo['src_dir'].split("/");
                var copiedFile = "";
                var targetName = sp[sp.length - 1];
                for (var i = 0; i < sp.length - 1; ++i) {
                    copiedFile += sp[i] + checker.getPathSeparator();
                }
                // File
                if (targetName != "__init__.py") {
                    copiedFile += targetName;
                }
                // Directory
                else {
                    targetName = sp[sp.length - 2];
                }
                var source = extractedPath + copiedFile;
                // copy add-on to add-on directory
                fsext.copySync(source, target + checker.getPathSeparator() + targetName);
                // delete garbage data
                del.sync([extractedPath], {force: true});
                updateInstalledAddonDB();
                // unlock "Download" button
                $scope.isDlBtnLocked = false;
            } // function onCompleteExtract
        } // function onDlBtnClicked

        function onRmBtnClicked($event) {
            var repoIndex = $($event.target).data('repo-index');
            var repo = $scope.addonStatus[main.repoList[repoIndex]]['installed'][blVer];
            var deleteFrom = repo['src_path'];
            $scope.isRmBtnLocked = true;
            if (!deleteFrom) { throw new Error(deleteFrom + "is not found"); }
            console.log("Deleting '" + deleteFrom + "' ...");
            var result = del.sync([deleteFrom], {force: true});
            console.log("Deleted '" + deleteFrom + "'");
            updateInstalledAddonDB();
            $scope.isRmBtnLocked = false;
        }

        function onUpBtnClicked($event) {
            $scope.isDlBtnLocked = true;
            onRmBtnClicked($event);
            onDlBtnClicked($event);
            $scope.isUpBtnLocked = false;
        }

        // "Download" button
        $scope.onDlBtnClicked = onDlBtnClicked;
        // "Remove" button
        $scope.onRmBtnClicked = onRmBtnClicked;
        // "Update" button
        $scope.onUpBtnClicked = onUpBtnClicked;
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
