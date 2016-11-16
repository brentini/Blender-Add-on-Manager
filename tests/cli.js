'use strict';

var checker = require('bl_add-on_checker');
var fs = require('fs');

fs.readFile('config.json', 'utf8', function (err, text) {
    checker.init();
    checker.checkInstalledBlAddon();
});


