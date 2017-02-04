'use strict';

var mongodb = require('mongodb');

var COLLECTION_NAME = 'blAddonGithub';

var dbWriter = {
    db: null,
    collection: null,

    init: function (collection, cb) {
        //var DB_URI = 'mongodb://localhost:27017/';
        var DB_HOSTNAME = 'localhost';
        var DB_PORT = 27017;
        //var mongodbCli = require('mongodb').MongoClient;

        var Server = mongodb.Server;
        var Db = mongodb.Db

        this.db = new Db(
             'blAddonMgr',
             new Server(DB_HOSTNAME, DB_PORT),
             {safe: false});

        this.db.open(function (err, db) {
            if (err) {
                console.log("open error");
            }
            else {
                db.listCollections().toArray(function (err, items) {
                    console.log(items);
                });
            }
        });
        
/*
        var obj = this;

        mongodbCli.connect(DB_URI, function (err, db) {
            obj.db = db;
            obj.collection = obj.db.collection(collection);
            console.log('Connected DB');
            cb();
        });
        */
    },

    close: function() {
        this.db.close();
    },

    add: function (info, cb) {
        var obj = this;
        this.collection.insert(info, function () {
            obj.collection.find({}, function(err, doc) {
                if (doc) {
                    console.log(doc._id);
                }
            });
            console.log("Suceeded insert.");
            cb();
        });
    }


};

dbWriter.init(COLLECTION_NAME, function() {
    console.log("");
});
/*dbWriter.init(COLLECTION_NAME, function() {
    dbWriter.add({'hoge': 'hhpiyo'}, function (){
        dbWriter.close();
    });
});
*/

module.exports = dbWriter;
