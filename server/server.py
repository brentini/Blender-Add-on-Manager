from flask import Flask, jsonify
from flask_restful import Resource, Api, abort
import json
import pymongo

app = Flask(__name__)
api = Api(app)

SERVICES = ['github']

class List(Resource):
    def get(self, service):
        if not service in SERVICES:
            abort(404, message='%s does not exist' % (service))
        f = open('./db/add-on_list.db')
        data = json.load(f)
        f.close()
        return jsonify(data)


class LastUpdate(Resource):
    def get(self, service):
        if not service in SERVICES:
            abort(404, message='%s does not exist' % (service))
        return jsonify([])


class Services(Resource):
    def get(self):
        db = BlAddonDB()
        db.connect()
        for data in db.get_all():
            print data
        return jsonify(SERVICES)


api.add_resource(Services, '/api/bl-addon-db/v1/services')
api.add_resource(LastUpdate, '/api/bl-addon-db/v1/last-update/<service>')
api.add_resource(List, '/api/bl-addon-db/v1/list/<service>')


class BlAddonDB():

    def __init__(self):
        self.__client = None
        self.__db = None
        self.__collection = None

    def connect(self):
        self.__client = pymongo.MongoClient('localhost', 27017)
        self.__db = self.__client.blAddonMgr
        self.__collection = self.__db.blAddonGitHub

    def find_one(self, key):
        return self.__collection.find_one(key)
    
    def find(self, key):
        return self.__collection.find(key)

    def get_all(self):
        return self.__collection.find()


if __name__ == '__main__':
    app.run(host='0.0.0.0', debug=True)

