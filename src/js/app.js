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

// ver1 > ver2 : 1
// ver1 == ver2 : 0
// ver1 < ver2 : -1
function compareAddonVersion(v1, v2)
{
    if (v1.length != 3 && v2.length != 3) {
        console.log('[WARN] Argument is not same size. (ver1:' + v1 + ', ver2:' + v2 + ')');
    }

    if (v1[0] > v2[0]) {
        return 1;
    }
    else if (v1[0] === v2[0]) {
        if (v1[1] > v2[1]) {
            return 1;
        }
        else if (v1[1] === v2[1]) {
            if (v1[2] > v2[2]) {
                return 1;
            }
            else if (v1[2] === v2[2]) {
                return 0;
            }
        }
    }

    return -1;
}

function updateAddonStatus(github, installed, blVer)
{
    var addonStatus = {};

    // setup add-on list on GitHub
    for (var g = 0, len = github.length; g < len; ++g) {
        var githubKey = github[g]['bl_info']['name'] + "@" + github[g]['bl_info']['author'];
        if (addonStatus[githubKey] == undefined) {
            addonStatus[githubKey] = {};
        }
        if (addonStatus[githubKey]['github'] == undefined) {
            addonStatus[githubKey]['github'] = github[g];
        }
        // newest version is registered
        else {
            var ver1 = addonStatus[githubKey]['github']['bl_info']['version'].split('.');
            var ver2 = github[g]['bl_info']['version'].split('.');
            if (compareAddonVersion(ver1, ver2) == -1) {
                addonStatus[githubKey]['github'] = github[g];
            }
        }
    }

    // setup add-on list installed on machine
    for (var blVer in installed) {
        for (var i = 0, len = installed[blVer].length; i < len; ++i) {
            var installedKey = installed[blVer][i]['bl_info']['name'] + "@" + installed[blVer][i]['bl_info']['author'];
            if (addonStatus[installedKey] == undefined) {
                addonStatus[installedKey] = {};
            }
            if (addonStatus[installedKey]['installed'] == undefined) {
                addonStatus[installedKey]['installed'] = {}
            }
            if (addonStatus[installedKey]['installed'][blVer] == undefined) {
                addonStatus[installedKey]['installed'][blVer] = installed[blVer][i];
            }
            // newest version is registered
            else {
                var ver1 = addonStatus[installedKey]['installed'][blVer]['bl_info']['version'].split('.');
                var ver2 = installed[blVer][i]['bl_info']['version'].split('.');
                if (compareAddonVersion(ver1, ver2) == -1) {
                    addonStatus[installedKey]['installed'][blVer] = installed[blVer][i];
                }
            }
        }
    }
    
    // update current status
    for (var k in addonStatus) {
        var addon = addonStatus[k];
        for (var blVer in installed) {
            var status = '';

            if (addon['github'] == undefined) {
                if (addon['installed'] != undefined && addon['installed'][blVer] != undefined) {
                    status = 'INSTALLED';
                }
            }
            else {
                if (addon['installed'] == undefined || addon['installed'][blVer] == undefined) {
                    status = 'NOT_INSTALLED';
                }
                else {
                    var ver1 = addon['github']['bl_info']['version'].split('.');
                    var ver2 = addon['installed'][blVer]['bl_info']['version'].split('.');
                    if (compareAddonVersion(ver1, ver2) == -1) {
                        status = 'UPDATABLE';
                    }
                    else {
                        status = 'INSTALLED';
                    }
                }
            }
            if (addonStatus[k]['status'] == undefined) {
                addonStatus[k]['status'] = {};
            }
            addonStatus[k]['status'][blVer] = status;
        }
    }
}


var downloadList = [];

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
        console.log(installedAddons);
    }

    function filterAddons(addons, category) {
        return addons.filter(function(elm, idx, arr) {
            var categoryMatched = (category.indexOf('All') != -1) || (category.indexOf(elm['bl_info']['category']) != -1);
            return categoryMatched;
        });
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

    function onAddonSelectorChanged() {
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
        var addons = [];

        switch (activeList) {
            case 'installed':
                console.log("Show Installed add-on list");
                if (blVer != '') {
                    if (installedAddons[blVer] != undefined) {
                        addons = filterAddons(installedAddons[blVer], activeCategory);
                    }
                }
                break;
            case 'github':
                console.log("Show GitHub add-on list");
                addons = filterAddons(githubAddons, activeCategory);
                break;
            case 'update':
                console.log("Show Updatable add-on list");
                break;
            default:
                return;
        }


        main.repoList = addons;
        $timeout(function() {
            var dlBtnList = $('.download');
            dlBtnList.unbind().click(function (ev) {
                var repoIndex = $(ev.target).data('repo-index');

                // now loading?
                var nowLoading = false;
                for (var i = 0; i < downloadList.length; ++i) {
                    if (repoIndex == downloadList[i]) {
                        nowLoading = true;
                    }
                }
                if (nowLoading) {
                    console.log(githubAddons[repoIndex]['bl_info']['name'] + "is now downloading." )
                    return;
                }
                downloadList.push(repoIndex);
                $(ev.target).prop('disabled', true);

                console.log("Downloding add-on '" + githubAddons[repoIndex]['bl_info']['name'] + "' from " + githubAddons[repoIndex]['download_url']);
                var target = checker.getAddonPath($scope.blVerSelect);
                if (target == null) { return; }
                var downloadTo = target + "\\" + githubAddons[repoIndex]['bl_info']['name'] + ".zip";
                console.log("Save to " + target + " ...");
                utils.downloadAndExtract(
                    githubAddons[repoIndex]['download_url'], config, downloadTo, target, onCompleteExtract);

                function onCompleteExtract() {
                    var target = checker.getAddonPath($scope.blVerSelect);
                    var extractedPath = target + "\\" + githubAddons[repoIndex]['repo_name'] + '-master';
                    var sp = githubAddons[repoIndex]['src_dir'].split("/");
                    var copiedFile = "";
                    var targetName = sp[sp.length - 1];
                    for (var i = 0; i < sp.length - 1; ++i) {
                        copiedFile += sp[i] + "\\";
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
                    console.log(source);
                    console.log(target);
                    fsext.copySync(source, target + "\\" + targetName);
                    del.sync([extractedPath], {force: true});
                    updateInstalledAddonDB();
                    //setTimeout(updateInstalledAddonDB, 1000);
                    for (var i = 0; i < downloadList.length; ++i) {
                        if (downloadList[i] == repoIndex) {
                            console.log(downloadList);
                            downloadList.splice(i, 1);
                        }
                        console.log(downloadList);
                    }
                }

            });


            var rmBtnList = $('.remove');
            rmBtnList.unbind().click(function(ev) {
                ev.stopPropagation()
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
updateAddonStatus(githubAddons, installedAddons, '2.75');

fs.readFile('config.json', 'utf8', function (err, text) {
    console.log("Parsing configuration file ...");
    config = JSON.parse(text);
    builder.init(config);
    //builder.fetchFromDBServer();
    console.log("Parsed configuration file ...");
    console.log(config);
});
