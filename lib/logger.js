'use strict';

var path = require('path');
var log4js = require('log4js');
var log4jsExt = require('log4js-extend');

var config = {
  "log4js": {
    "level": "ALL",
    "configure": {
      "appenders": [
        {
          "category": "lib",
          "type": "file",
          "filename": "logs/lib.log"
        },
        {
          "category": "app",
          "type": "file",
          "filename": "logs/app.log"
        }
      ]
    }
  }
};

var logger = {
    log: {},

    init: function () {
        console.log("Initializing logger ...");
        log4js.configure(config['log4js']['configure']);
        log4jsExt(log4js, {
            path: __dirname,
            format: "(@name) [@file:@line:@column]"
        });
        this.log = {
            lib: log4js.getLogger('lib'),
            app: log4js.getLogger('app')
        };
        for (var category in this.log) {
            this.log[category].setLevel(config.log4js.level);
        }
    },

    category: function(category) {
        return this.log[category];
    },



    debug: function (category, msg) {
        this.log[category].debug(msg);
    },

    info: function (category, msg) {
        this.log[category].info(msg);
    },

    warn: function (category, msg) {
        this.log[category].warn(msg);
    },

    error: function (category, msg) {
        this.log[category].error(msg);
    },

    fatal: function (category, msg) {
        this.log[category].fatal(msg);
    }
};


module.exports = logger;
