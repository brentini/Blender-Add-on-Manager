'use strict';

var builder = require('bl_add-on_db');
var fs = require('fs');
var ADDON_DB_FILE = './db/add-on_list.db';
var config = null;

fs.readFile('config.json', 'utf8', function (err, text) {
    console.log("Parsing configuration file ...");
    config = JSON.parse(text);
    console.log("Parsed configuration file ...");
    builder.init(config);
    builder.updateDBFile(ADDON_DB_FILE);
});


