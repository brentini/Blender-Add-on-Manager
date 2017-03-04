'use strict';
 
var mongodb = require('mongodb').MongoClient;

var DB_NAME = 'blAddonMgr';
var COLLECTION_NAME = 'blAddonGitHub';
var DB_HOSTNAME = 'localhost';
var DB_PORT = 27017;

var dbWriter = {
    db: null,
    collection: null,

    init: function (cb) {
        var uri = 'mongodb://' + DB_HOSTNAME + ":" + DB_PORT + "/" + DB_NAME;
        console.log("Connecting to DB Server " + uri + " ...");
        var obj = this;

        mongodb.connect(uri, function (err, db) {
            if (err) {
                throw new Error("Failed to connect DB Server " + url);
            }
            obj.db = db;
            obj.collection = db.collection(COLLECTION_NAME);
            if (cb) {
                cb();
            }
        });
    },

    connected: function() {
        return this.db ? true : false;
    },

    close: function() {
        if (!this.db) { throw new Error("DB does not open"); }

        this.db.close();
    },

    add: function (info, cb) {
        if (!this.collection) { throw new Error("Collection is null"); }

        this.collection.insert(info, function (err, record) {
            if (err) { throw new Error("Failed to add (err=" + err + ")"); }
            console.log("Suceeded insert.");
            if (cb) {
                cb();
            }
        });
    },

    update: function (key, data, cb) {
        if (!this.collection) { throw new Error("Collection is null"); }

        this.collection.update(key, {$set: data}, cb);
    },

    find: function (key, cb) {
        if (!this.collection) { throw new Error("Collection is null"); }

        this.collection.find(key, cb);
    },

    findOne: function (key, cb) {
        if (!this.collection) { throw new Error("Collection is null"); }

        this.collection.findOne(key, cb);
    }
};

module.exports = dbWriter;
