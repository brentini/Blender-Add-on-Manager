'use strict';

//var request = require('request');
var request = require('cheerio-httpcli');

request.fetch(
    "http://192.168.0.8:5000/api/bl-addon-db/v1/list/github",
    {
        q: 'bl_info%2Btest',
        type: 'Code',
        ref: 'searchresults',
        p: 1
    },
    (err, $, body) => {
        if (!err) {
            console.log(body);
        }
        else {
            console.log(err);
        }
    }
);
