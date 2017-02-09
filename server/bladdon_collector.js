'use strict';

var childProcs = require('child_process');

var minPage = 1;
var maxPage = 100;
var nPagesPerCmd = 5;
var minFileSize = 0;
var maxFileSize = 100 * 1024 * 1024;
var nFileSizePerCmd = 500;
var waitInterval = 10 * 1000;   // 10sec

function execCmd(size, page) {
    var startPage = page;
    var endPage = page + nPagesPerCmd - 1;
    var startFileSize = size;
    var endFileSize = size + nFileSizePerCmd - 1;

    var cmd = 'node collect_bladdon.js --page ' + startPage + '-' +endPage + ' --filesize ' + startFileSize + '-' + endFileSize;

    console.log(cmd);

    childProcs.execSync(cmd, function(err, stdout, stderr) {
        console.log(stdout);
        console.log(err);
        console.log(stderr);
    });

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

execCmd(minFileSize, minPage);

