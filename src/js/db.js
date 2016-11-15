'use strict';

var fs = require('fs');
var builder = require('bl_add-on_db');
var path = require('path');
var ADDON_DB_FILE = path.resolve('./db/add-on_list.db');
var addonDB = null;
var config = null;

var app = angular.module('readus', [])
app.controller('MainController', function ($scope, $timeout) {
    var main = this;

    console.log("test");

    main.repoList = [];
    $timeout(function() {
        main.repoList = addonDB;
    });
});


$('#update-db').click(function (e) {
    builder.updateDBFile(ADDON_DB_FILE);
});

if (builder.isExistFile(ADDON_DB_FILE)) {
    console.log("Reading add-on DB file ...")
    addonDB = builder.readDBFile(ADDON_DB_FILE);
    console.log(addonDB);
}
fs.readFile('config.json', 'utf8', function (err, text) {
    console.log("Parsing configuration file ...");
    config = JSON.parse(text);
    console.log("Parsed configuration file ...");
    console.log(config);
});
