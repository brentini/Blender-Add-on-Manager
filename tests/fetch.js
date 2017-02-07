'use strict';

var db = require('bl_add-on_db');
var fs = require('fs');
var path = require('path');
var ADDON_DB_FILE = path.resolve('./db/add-on_list.db');

var config = null;

fs.readFile('config.json', 'utf8', function (err, text) {
    config = JSON.parse(text);
    console.log(config);
    db.init(config);
    db.fetchFromDBServer(ADDON_DB_FILE);
});
