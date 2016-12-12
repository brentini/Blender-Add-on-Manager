from flask import Flask, jsonify
from flask_restful import Resource, Api, abort
import json

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
        return jsonify(SERVICES)


api.add_resource(Services, '/api/bl-addon-db/v1/services')
api.add_resource(LastUpdate, '/api/bl-addon-db/v1/last-update/<service>')
api.add_resource(List, '/api/bl-addon-db/v1/list/<service>')

if __name__ == '__main__':
    app.run(debug=True)

