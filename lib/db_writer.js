'use strict';

var mongodb = require('mongodb');

var DB_NAME = 'blAddonMgr';
var COLLECTION_NAME = 'blAddonGitHub';
var DB_HOSTNAME = 'localhost';
var DB_PORT = 27017;

var dbWriter = {
    db: null,
    collection: null,

    init: function (cb) {
        var Server = mongodb.Server;
        var Db = mongodb.Db;

        console.log("Connecting to DB Server ...");

        this.db = new Db(
             DB_NAME,
             new Server(DB_HOSTNAME, DB_PORT),
             {safe: false});

        var obj = this;

        this.db.open(function (err, db) {
            if (err) {
                console.log("open error");
            }
            else {
                db.collection(COLLECTION_NAME, function (err, collection) {
                    if (err) {
                        console.log(err);
                        console.log("get collection error");
                    }
                    else {
                        obj.collection = collection;
                        cb();
                    }
                });
            }
        });
    },

    close: function() {
        this.db.close();
    },

    add: function (info, cb) {
        this.collection.insert(info, function (err, record) {
            if (err) {
                console.log(err);
                console.log("Failed to add");
            }
            else {
                console.log("Suceeded insert.");
                cb();
            }
        });
    },

    update: function (key, data, cb) {
        this.collection.update(key, {$set: data}, cb);
    },

    find: function (key, cb) {
        this.collection.find(key, cb);
    },

    findOne: function (key, cb) {
        this.collection.findOne(key, cb);
    }
};


module.exports = dbWriter;
