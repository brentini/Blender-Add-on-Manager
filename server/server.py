from flask import Flask, jsonify
from flask_restful import Resource, Api
import json

app = Flask(__name__)
api = Api(app)

class GitHubAddonList(Resource):
    def get(self):
        f = open('./db/add-on_list.db')
        data = json.load(f)
        f.close()
        return jsonify(data)

api.add_resource(GitHubAddonList, '/blender_add-on_manager_for_github/github_add-on_list')

if __name__ == '__main__':
    app.run(debug=True)

