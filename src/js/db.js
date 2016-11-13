'use strict';

var fs = require('fs');
var builder = require('bl_add-on_db');
var ADDON_DB_FILE = './db/add-on_list.db';
var addonDB = null;
var config = null;

/*
function readDBFile(file) {
    if (builder.isExistFile(file)) {
        console.log('Not found DB file...');
        return false;
    }

    console.log('Reading DB file...');

    var json = require(file);

    return json;
}
*/



//$(function() {
    var app = angular.module('readus', [])
    app.controller('MainController', function ($scope) {
        var main = this;

        console.log("test");

        /*$scope.$apply(function () {
            main.repoList = ['test'];
        });*/
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
//});
