import pymongo

DB_NAME = "blAddonMgr"
COLLECTION_NAME = "blAddonGitHub"
DB_HOSTNAME = "localhost"
DB_PORT = 27017

client = pymongo.MongoClient(DB_HOSTNAME, DB_PORT)

db = client.blAddonMgr
collection = db.blAddonGitHub

for data in collection.find():
    print data
