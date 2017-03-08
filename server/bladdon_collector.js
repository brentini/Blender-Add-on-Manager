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
var waitInterval = 40 * 1000;   // 10sec

var config;

function zeroPadding(str, digit) {
    var s = '';
    for (var i = 0; i < digit; ++i) {
        s += '0';
    }
    s += str;
    return s.slice(-digit);
}

function getDate() {
    var date = new Date();
    var year = date.getYear() + 1900;
    var mon = date.getMonth() + 1;
    var day = date.getDate();
    var hour = date.getHours();
    var min = date.getMinutes();
    var sec = date.getSeconds();

    return "["
        + zeroPadding(year, 4)
        + "."
        + zeroPadding(mon, 2)
        + "."
        + zeroPadding(day, 2)
        + " "
        + zeroPadding(hour, 2)
        + ":"
        + zeroPadding(min, 2)
        + ":"
        + zeroPadding(sec, 2)
        + "]";
}

function collectBlAddon(startPage, endPage, startFileSize, endFileSize) {
    try {
        builder.init(config, startPage, endPage, startFileSize, endFileSize);
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

    var param = 'Page=' + startPage + '-' +endPage + ', FileSize=' + startFileSize + '-' + endFileSize;
    console.log(getDate() + " " + param);
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


var text;

text = fs.readFileSync(CONFIG_FILE, 'utf8');
console.log("Parsing configuration file ...");
config = JSON.parse(text);
console.log("Parsed configuration file ...");

dbWriter.init( () => {
    execCmd(minFileSize, minPage);
});
