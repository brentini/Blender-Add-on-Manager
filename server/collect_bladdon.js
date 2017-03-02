'use strict';

var builder = require('bl_add-on_db');
var fs = require('fs');
var path = require('path');
var opts = require('opts');

var ADDON_DB_FILE = path.resolve('./db/add-on_list.db');
var config = null;

var startPage = 0;
var endPage = 1;
var minFileSize = 0;
var maxFileSize = 1000;

var options = [
    {
        'short': 'p',
        'long': 'page',
        'description': 'Page',
        'value': true,
        'required': false,
        'callback': (value) => {
            var page = value.split('-');
            if (page.length != 2) { console.log("page"); process.exit(1); }
            if (page[0] == '' || page[0].match(/\D/)) { console.log("pnum0"); process.exit(1); }
            if (page[1] == '' || page[1].match(/\D/)) { console.log("pnum1"); process.exit(1); }
            startPage = +page[0];
            endPage = +page[1];
        }
    },
    {
        'short': 's',
        'long': 'filesize',
        'description': 'Size of source code',
        'value': true,
        'required': false,
        'callback': (value) => {
            var size = value.split('-');
            if (size.length != 2) { console.log("size"); process.exit(1); }
            if (size[0] == '' || size[0].match(/\D/)) { console.log("pnum0"); process.exit(1); }
            if (size[1] == '' || size[1].match(/\D/)) { console.log("pnum1"); process.exit(1); }
            minFileSize = +size[0];
            maxFileSize = +size[1];
        }
    },
];

opts.parse(options);


fs.readFile('config.json', 'utf8', function (err, text) {
    try {
        console.log("Parsing configuration file ...");
        config = JSON.parse(text);
        console.log("Parsed configuration file ...");
        builder.init(config, startPage, endPage, minFileSize, maxFileSize);
        builder.updateDBFile(ADDON_DB_FILE);
    }
    catch (e) {
        console.log(e);
    }
});
