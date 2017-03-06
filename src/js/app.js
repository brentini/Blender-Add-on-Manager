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
var CONFIG_FILE_PATH = "config.json";
var BL_INFO_UNDEF = "626c5f696e666f5f@UNDEF";


var config = null;
var app = angular.module('readus', [])


app.controller('MainController', function ($scope, $timeout) {
    // read configuration file
    if (!utils.isExistFile(CONFIG_FILE_PATH)) { throw new Error(CONFIG_FILE_PATH + "is not exist"); }
    var text = fs.readFileSync(CONFIG_FILE_PATH, 'utf8');
    config = JSON.parse(text);
    // initialize
    checker.init();
    builder.init(config);

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

    $scope.githubAddons = loadGitHubAddonDB();
    $scope.installedAddons = loadInstalledAddonsDB();
    $scope.addonStatus = updateAddonStatus($scope.githubAddons, $scope.installedAddons, $scope.blVerList);


    var main = this;
    main.repoList = [];

    $scope.blVerSelect = $scope.blVerList[0];
    $scope.showBlVerSelect = true;


    $scope.onAddonSelectorChanged = onAddonSelectorChanged;


    // [TODO]
    $('#update-github-addon-db').click(function (e) {
        updateGitHubAddonDB();
    });

    $('#update-installed-addon-db').click(function (e) {
        updateInstalledAddonDB();
    });


    function updateGitHubAddonDB() {
        builder.fetchFromDBServer(GITHUB_ADDONS_DB);
        $scope.githubAddons = loadGitHubAddonDB();
        $scope.addonStatus = updateAddonStatus($scope.githubAddons, $scope.installedAddons, $scope.blVerList);
        onAddonSelectorChanged();
    }

    function updateInstalledAddonDB() {
        checker.checkInstalledBlAddon();
        checker.saveTo(INSTALLED_ADDONS_DB);
        $scope.installedAddons = loadInstalledAddonsDB();
        $scope.addonStatus = updateAddonStatus($scope.githubAddons, $scope.installedAddons, $scope.blVerList);
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

    $scope.isOpsLocked = false;

    $scope.blStr = (content, str) => {
        if (str != BL_INFO_UNDEF) { return str; }
        var def = {
            'title': "(No Title)",
            'description': "(No Description)",
            'author': "(Annonymous)",
            'blender': "-",
            'version': "-",
            'category': "-"
        };
        return def['content'];
    };

    $scope.getAddonStatus = (key) => {
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

        function installAddon(repo, cb) {
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
                // callback
                cb();
            } // function onCompleteExtract
        }

        function removeAddon(repo) {
            var deleteFrom = repo['src_path'];
            if (!deleteFrom) { throw new Error(deleteFrom + "is not found"); }
            console.log("Deleting '" + deleteFrom + "' ...");
            var result = del.sync([deleteFrom], {force: true});
            console.log("Deleted '" + deleteFrom + "'");
        }

        function onDlBtnClicked($event) {
            var repoIndex = $($event.target).data('repo-index');
            var repo = $scope.addonStatus[main.repoList[repoIndex]]['github'];
            // lock "Download" button
            $scope.isOpsLocked = true;
            installAddon(repo, () => {
                updateInstalledAddonDB();
                // unlock "Download" button
                $scope.isOpsLocked = false;
            });
        }

        function onRmBtnClicked($event) {
            var repoIndex = $($event.target).data('repo-index');
            var repo = $scope.addonStatus[main.repoList[repoIndex]]['installed'][blVer];
            // lock "Remove" button
            $scope.isOpsLocked = true;
            removeAddon(repo);
            updateInstalledAddonDB();
            // unlock "Remove" button
            $scope.isOpsLocked = false;
        }

        function onUpBtnClicked($event) {
            var repoIndex = $($event.target).data('repo-index');
            var repoInstalled = $scope.addonStatus[main.repoList[repoIndex]]['installed'][blVer];
            var repoGitHub = $scope.addonStatus[main.repoList[repoIndex]]['github'];
            // lock "Update" button
            $scope.isOpsLocked = true;
            removeAddon(repoInstalled);
            installAddon(repoGitHub, () => {
                updateInstalledAddonDB();
                // unlock "Update" button
                $scope.isOpsLocked = false;
            });
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
    if (!utils.isExistFile(GITHUB_ADDONS_DB)) { throw new Error("GitHub Add-ons DB File not found"); }
    console.log("Loading GitHub add-ons DB file ...")
    return builder.readDBFile(GITHUB_ADDONS_DB);
}

function loadInstalledAddonsDB() {
    if (!utils.isExistFile(INSTALLED_ADDONS_DB)) { throw new Error("Installed Add-ons DB File not found"); }
    console.log("Loading installed add-ons DB file ...");
    return builder.readDBFile(INSTALLED_ADDONS_DB);
}
