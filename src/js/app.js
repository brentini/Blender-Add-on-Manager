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
app.controller('MainController', function ($scope, $timeout) {
    var main = this;

    main.repoList = [];
    $timeout(function() {
        main.repoList = githubAddons;
        main.blVerList = ['2.76', '2.77'];
    });
    $scope.showBlVerSelect = true;

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

    $('#update-db').click(function (e) {
        builder.updateDBFile(GITHUB_ADDONS_DB);
    });

});


if (utils.isExistFile(GITHUB_ADDONS_DB)) {
    console.log("Reading GitHub add-ons DB file ...")
    githubAddons = builder.readDBFile(GITHUB_ADDONS_DB);
}

if (utils.isExistFile(INSTALLED_ADDONS_DB)) {
    console.log("Reading installed add-ons DB file ...");
    installedAddons = builder.readDBFile(INSTALLED_ADDONS_DB);
}

fs.readFile('config.json', 'utf8', function (err, text) {
    console.log("Parsing configuration file ...");
    config = JSON.parse(text);
    console.log("Parsed configuration file ...");
});
