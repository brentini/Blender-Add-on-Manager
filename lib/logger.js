'use strict';

var path = require('path')
var log4js = require('log4js');

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
      ],
      "replaceConsole": true
    }
  }
};

var logger = {
    log: {},

    init: function () {
        log4js.configure(config.log4js.configure);
        this.log = {
            system: log4js.getLogger('lib')
        };
        for (var key in this.log) {
            this.log[key].setLevel(config.log4js.level);
        }
    }
};

module.exports = logger;
