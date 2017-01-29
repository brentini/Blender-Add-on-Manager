'use strict';

var dbWriter = {
    init: function () {
        var DB_URI = 'mongodb://localhost:27017/';
        var COLLECTION_NAME = 'bl-addon-github';

        var mongodbCli = require('mongodb').MongoClient;

        mongodbCli.connect(DB_URI, function (err, db) {
            var db.collection(COLLECTION_NAME);
            console.log('Connected DB');
            db.close();
        });
    }
};

dbWriter.init();

module.exports = dbWriter;
