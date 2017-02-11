'use strict';

var checker = require('bl_add-on_checker');
var path = require('path');

checker.init();
checker.checkInstalledBlAddon();
checker.saveTo(path.resolve('./db/installed_add-on_list.db'));


