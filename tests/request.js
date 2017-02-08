'use strict';

//var request = require('request');
var request = require('cheerio-httpcli');

request.fetch(
    "http://localhost:5000/api/bl-addon-db/v1/list/github",
    {
        q: 'size:0..100',
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
