'use strict';

var fs = require('fs');
var builder = require('bl_add-on_db');
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

    console.log("test");

    main.repoList = [];
    $timeout(function() {
        main.repoList = githubAddons;
    });
    $('#btn-github-addonlist').click(function (e) {
        console.log("Show GitHub add-on list");
        main.repoList = githubAddons;
    });
    $('#btn-installed-addonlist').click(function (e) {
        console.log("Show Installed add-on list");
        main.repoList = installedAddons['2.77'];
    });
});



$('#update-db').click(function (e) {
    builder.updateDBFile(GITHUB_ADDONS_DB);
});

if (utils.isExistFile(GITHUB_ADDONS_DB)) {
    console.log("Reading GitHub add-ons DB file ...")
    githubAddons = builder.readDBFile(GITHUB_ADDONS_DB);
    console.log(githubAddons);
}

if (utils.isExistFile(INSTALLED_ADDONS_DB)) {
    console.log("Reading installed add-ons DB file ...");
    installedAddons = builder.readDBFile(INSTALLED_ADDONS_DB);
    console.log(installedAddons);
}


fs.readFile('config.json', 'utf8', function (err, text) {
    console.log("Parsing configuration file ...");
    config = JSON.parse(text);
    console.log("Parsed configuration file ...");
    console.log(config);
});
