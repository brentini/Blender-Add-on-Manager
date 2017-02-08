'use strict';

var exec = require('child_process').exec;

var startPage = 0;
var endPage = 1;
var minFileSize = 0;
var maxFileSize = 1000;

var cmd = 'node collect_bladdon.js --page ' + startPage + '-' +endPage + ' --filesize ' + minFileSize + '-' + maxFileSize;

console.log(cmd);

exec(cmd, function(err, stdout, stderr) {
    console.log(stdout);
    console.log(err);
    console.log(stderr);
});
