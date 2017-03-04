'use strict';

var builder = require('bl_add-on_db');
var fs = require('fs');
var path = require('path');
var dbWriter = require('db_writer');

var CONFIG_FILE = path.resolve('./config.json');

var minPage = 1;
var maxPage = 100;
var nPagesPerCmd = 5;
var minFileSize = 0;
var maxFileSize = 100 * 1024 * 1024;
var nFileSizePerCmd = 500;
var waitInterval = 10 * 1000;   // 10sec

function getDate() {
    var date = new Date();
    var year = date.getYear() + 1900;
    var mon = date.getMonth() + 1;
    var day = date.getDate();
    var hour = date.getHours();
    var min = date.getMinutes();
    var sec = date.getSeconds();

    return "[" + year + "." + mon + "." + day + " " + hour + ":" + min + ":" + sec + "]";
}

function collectBlAddon(startPage, endPage, startFileSize, endFileSize) {
    try {
        var text;
        var config;

        text = fs.readFileSync(CONFIG_FILE, 'utf8');
        console.log("Parsing configuration file ...");
        config = JSON.parse(text);
        console.log("Parsed configuration file ...");
        builder.init(config, startPage, endPage, minFileSize, maxFileSize);
        builder.writeDB(dbWriter);
    }
    catch (e) {
        console.log(e);
    }
}

function execCmd(size, page) {
    var startPage = page;
    var endPage = page + nPagesPerCmd - 1;
    var startFileSize = size;
    var endFileSize = size + nFileSizePerCmd - 1;

    var cmd = 'node collect_bladdon.js --page ' + startPage + '-' +endPage + ' --filesize ' + startFileSize + '-' + endFileSize;

    console.log(getDate() + " " + cmd);
    collectBlAddon(startPage, endPage, startFileSize, endFileSize);

    var nextFileSize = size;
    var nextPage = page + nPagesPerCmd;

    if (nextPage > maxPage) {
        nextFileSize = size + nFileSizePerCmd;
        nextPage = minPage;
    }
    if (nextFileSize > maxFileSize) {
        return;
    }

    setTimeout(() => { execCmd(nextFileSize, nextPage) }, waitInterval);
}

dbWriter.init( () => {
    execCmd(minFileSize, minPage);
});

