from flask import Flask, jsonify
from flask_restful import Resource, Api, abort
import json
import pymongo
from bson import ObjectId
from bson import Binary, Code
from bson.json_util import loads, dumps

app = Flask(__name__)
api = Api(app)

SERVICES = ['github']


class JSONEncoder(json.JSONEncoder):
    def default(self, o):
        if isinstance(o, ObjectId):
            return str(o)
        return json.JSONEncoder.default(self, o)


class List(Resource):
    def get(self, service):
        if not service in SERVICES:
            abort(404, message='%s does not exist' % (service))
        db = BlAddonDB(service)
        db.connect()
        data = []
        for d in db.get_all():
            en = JSONEncoder().encode(d)
            de = json.JSONDecoder().decode(en)
            data.append(de)
        return jsonify(data)


class LastUpdate(Resource):
    def get(self, service):
        if not service in SERVICES:
            abort(404, message='%s does not exist' % (service))
        return jsonify([])


class Services(Resource):
    def get(self):
        return jsonify(SERVICES)


api.add_resource(Services, '/api/bl-addon-db/v1/services')
api.add_resource(LastUpdate, '/api/bl-addon-db/v1/last-update/<service>')
api.add_resource(List, '/api/bl-addon-db/v1/list/<service>')


class BlAddonDB():

    def __init__(self, service):
        self.__client = None
        self.__db = None
        self.__collection = None
        self.__service = service

    def connect(self):
        self.__client = pymongo.MongoClient('localhost', 27017)
        if self.__service == 'github':
            self.__db = self.__client.blAddonMgr
            self.__collection = self.__db.blAddonGitHub
        #else:
        #    print("Service" + self.__service + "is not supported"

    def find_one(self, key):
        return self.__collection.find_one(key)
    
    def find(self, key):
        return self.__collection.find(key)

    def get_all(self):
        return self.__collection.find()


if __name__ == '__main__':
    app.run(host='0.0.0.0', debug=True)

