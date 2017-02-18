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
    loadGitHubAddonDB();
    loadInstalledAddonsDB();
    $scope.addonStatus = updateAddonStatus(githubAddons, installedAddons);

    fs.readFile('config.json', 'utf8', function (err, text) {
        console.log("Parsing configuration file ...");
        config = JSON.parse(text);
        builder.init(config);
        //builder.fetchFromDBServer();
        console.log("Parsed configuration file ...");
    });


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
        builder.fetchFromDBServer(GITHUB_ADDONS_DB);
        loadGitHubAddonDB();
        $scope.addonStatus = updateAddonStatus(githubAddons, installedAddons);
        onAddonSelectorChanged();
    }

    function updateInstalledAddonDB() {
        checker.init();
        checker.checkInstalledBlAddon();
        checker.saveTo(INSTALLED_ADDONS_DB);
        loadInstalledAddonsDB();
        $scope.addonStatus = updateAddonStatus(githubAddons, installedAddons);
        onAddonSelectorChanged();
    }



    $scope.showButtonLabel = function (repo) {
        var status = $scope.addonStatus[repo.bl_info.name + '@' + repo.bl_info.author]['status'][$scope.blVerSelect];

        if (status == 'NOT_INSTALLED') {
            return 'Install';
        }
        else if (status == 'UPDATABLE') {
            return 'Update';
        }

        return 'Installed';
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
                if (installedAddons[blVer]) {
                    addons = filterAddons(
                        $scope.addonStatus,
                        'installed',
                        ['INSTALLED', 'NOT_INSTALLED', 'UPDATABLE'],
                        blVer,
                        activeCategory,
                        searchStr);
                    console.log(addons);
                    //addons = filterAddons(installedAddons[blVer], activeCategory, searchStr);
                }
                $scope.addonInfoTpl = 'partials/addon-info/github.html';
                break;
            case 'github':
                console.log("Show GitHub add-on list");
                if (githubAddons) {
                    //addons = filterAddons(githubAddons, activeCategory, searchStr);
                }
                $scope.addonInfoTpl = 'partials/addon-info/github.html';
                break;
            case 'update':
                console.log("Show Updatable add-on list");
                var updatableAddons = [];
                for (var key in $scope.addonStatus) {
                    if ($scope.addonStatus[key]['status'][blVer] === 'UPDATABLE') {
                        updatableAddons.push({'github': $scope.addonStatus[key]['github'], 'installed': $scope.addonStatus[key]['installed'][blVer]});
                    }
                }
                updatableAddons = updatableAddons.filter(function(elm, idx, arr) {
                    var categoryMatched = (activeCategory.indexOf('All') != -1) || (category.indexOf(elm['github']['bl_info']['category']) != -1);
                    return categoryMatched;
                });
                addons = updatableAddons['github'];
                $scope.addonInfoTpl = 'partials/addon-info/update.html';
                break;
            default:
                return;
        }
        main.repoList = addons;

        // "Download" button
        $scope.onDlBtnClicked = ($event) => {
            var repoIndex = $($event.target).data('repo-index');
            // lock "Download" button
            $scope.isDlBtnLocked = true;

            console.log("Downloding add-on '" + githubAddons[repoIndex]['bl_info']['name'] + "' from " + githubAddons[repoIndex]['download_url']);
            var target = checker.getAddonPath($scope.blVerSelect);
            if (target == null) {
                // try to make add-on dir.
                checker.createAddonDir($scope.blVerSelect);
                target = checker.getAddonPath($scope.blVerSelect);
                if (target == null) {
                    throw new Error("Failed to make add-on directory");
                }
            }

            // download and extract add-on
            var downloadTo = target + checker.getPathSeparator() + githubAddons[repoIndex]['bl_info']['name'] + ".zip";
            console.log("Save to " + downloadTo + " ...");
            utils.downloadAndExtract(
                githubAddons[repoIndex]['download_url'], config, downloadTo, target, onCompleteExtract);

            function onCompleteExtract() {
                var target = checker.getAddonPath($scope.blVerSelect);
                var extractedPath = target + checker.getPathSeparator() + githubAddons[repoIndex]['repo_name'] + '-master';
                var sp = githubAddons[repoIndex]['src_dir'].split("/");
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
            } // function onCompleteExtract()
        }; // $scope.onDlBtnClicked

        // "Remove" button
        $scope.onRmBtnClicked = ($event) => {
            var repoIndex = $($event.target).data('repo-index');
            var deleteFrom = installedAddons[blVer][repoIndex]['src_path'];
            $scope.isRmBtnLocked = true;
            if (!deleteFrom) { throw new Error(deleteFrom + "is not found"); }
            console.log("Deleting '" + deleteFrom + "' ...");
            var result = del.sync([deleteFrom], {force: true});
            console.log("Deleted '" + deleteFrom + "'");
            updateInstalledAddonDB();
            $scope.isRmBtnLocked = false;
        };
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
