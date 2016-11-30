'use strict';

var fs = require('fs');
var builder = require('bl_add-on_db');
var checker = require('bl_add-on_checker');
var path = require('path');

var utils = require('nutti_utils');


var GITHUB_ADDONS_DB = path.resolve('./db/add-on_list.db');
var INSTALLED_ADDONS_DB = path.resolve('./db/installed_add-on_list.db');

var githubAddons = null;
var installedAddons = null;

var config = null;

var app = angular.module('readus', [])

function updateAddonStatus(github, installed, blVer) {
    addonStatus = {};

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
        main.blVerList = ['2.76', '2.77'];
    });
    $scope.showBlVerSelect = true;

    $scope.addonCategories = [
        {id: 1, name: 'All', value: 'all'},
        {id: 2, name: '3D View', value: '3d_view'},
        {id: 3, name: 'Add Curve', value: 'add_curve'},
        {id: 4, name: 'Add Mesh', value: 'add_mesh'},
        {id: 5, name: 'Animation', value: 'animation'},
        {id: 6, name: 'Development', value: 'development'},
        {id: 7, name: 'Game Engine', value: 'game_engine'},
        {id: 8, name: 'Import-Export', value: 'import_export'},
        {id: 9, name: 'Material', value: 'material'},
        {id: 10, name: 'Mesh', value: 'mesh'},
        {id: 11, name: 'Node', value: 'node'},
        {id: 12, name: 'Object', value: 'object'},
        {id: 13, name: 'Paint', value: 'paint'},
        {id: 14, name: 'Pie Menu', value: 'pie_menu'},
        {id: 15, name: 'Render', value: 'render'},
        {id: 16, name: 'Rigging', value: 'rigging'},
        {id: 17, name: 'System', value: 'system'},
        {id: 18, name: 'UI', value: 'ui'},
        {id: 19, name: 'UV', value: 'uv'}
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

    $('#btn-github-addonlist').click(function (e) {
        console.log("Show GitHub add-on list");
        $timeout(function() {
            main.repoList = githubAddons;

            var dlBtnList = $('.download');
            console.log(dlBtnList);
            dlBtnList.click(function (ev) {
                var repoIndex = $(ev.target).data('repo-index');
                console.log("Downloding add-on '" + githubAddons[repoIndex]['bl_info']['name'] + "' from " + githubAddons[repoIndex]['download_url']);
                //utils.downloadFile(githubAddons[repoIndex]['download_url'], config, "./download/" + githubAddons[repoIndex]['bl_info']['name'] + ".zip");
                console.log(checker.getAddonPath($scope.blVerSelect));
            });
        });
    });
    $('#btn-installed-addonlist').click(function (e) {
        console.log("Show Installed add-on list");
        $timeout(function() {
            if ($scope.blVerSelect != '') {
                main.repoList = installedAddons[$scope.blVerSelect];
            }
        });
    });
    $scope.blVerSelectChanged = function () {
        main.repoList = installedAddons[$scope.blVerSelect];
    };
    $scope.addonListSelectorChanged = function () {
        var list = $scope.addonList;
        if (list == 'installed') {
            console.log("Show Installed add-on list");
            $timeout(function() {
                if ($scope.blVerSelect != '') {
                    main.repoList = installedAddons[$scope.blVerSelect];
                }
            });
        }
        else if (list == 'github') {
            console.log("Show GitHub add-on list");
            $timeout(function() {
                main.repoList = githubAddons;

                var dlBtnList = $('.download');
                console.log(dlBtnList);
                dlBtnList.click(function (ev) {
                    var repoIndex = $(ev.target).data('repo-index');
                    console.log("Downloding add-on '" + githubAddons[repoIndex]['bl_info']['name'] + "' from " + githubAddons[repoIndex]['download_url']);
                    //utils.downloadFile(githubAddons[repoIndex]['download_url'], config, "./download/" + githubAddons[repoIndex]['bl_info']['name'] + ".zip");
                    console.log(checker.getAddonPath($scope.blVerSelect));
                });
            });
        }
        else if (list == 'update') {
            console.log("Show Updatable add-on list");
        }
    };
    $scope.addonCategorySelectorChanged = function () {
    };

    $('#update-db').click(function (e) {
        builder.updateDBFile(GITHUB_ADDONS_DB);
    });

    function onAddonSelectorChanged() {

    }

});


if (utils.isExistFile(GITHUB_ADDONS_DB)) {
    console.log("Reading GitHub add-ons DB file ...")
    githubAddons = builder.readDBFile(GITHUB_ADDONS_DB);
}

if (utils.isExistFile(INSTALLED_ADDONS_DB)) {
    console.log("Reading installed add-ons DB file ...");
    installedAddons = builder.readDBFile(INSTALLED_ADDONS_DB);
}

updateAddonStatus(githubAddons, installedAddons, '2.75')

fs.readFile('config.json', 'utf8', function (err, text) {
    console.log("Parsing configuration file ...");
    config = JSON.parse(text);
    console.log("Parsed configuration file ...");
});
