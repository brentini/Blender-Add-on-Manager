'use strict';

var builder = require('bl_add-on_db');
var fs = require('fs');
var path = require('path');
var ADDON_DB_FILE = path.resolve('./db/add-on_list.db');
var config = null;

if (process.argv.length != 4) {
    console.log("argument error\nUsage: node db.js start_page end_page");
    process.exit(1);
}

fs.readFile('config.json', 'utf8', function (err, text) {
    console.log("Parsing configuration file ...");
    config = JSON.parse(text);
    console.log("Parsed configuration file ...");
    builder.init(config);
    builder.setPage(+process.argv[2], +process.argv[3]);
    builder.updateDBFile(ADDON_DB_FILE);
});


