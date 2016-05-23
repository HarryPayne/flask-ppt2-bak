#!bin/python
# Create all of the tables for the SQLAlchemy models.
# You need to create the database first, though.

from os import environ, path

environ["PPT_ENVIRONMENT"] = "test"

from flask_sqlalchemy import SQLAlchemy
from migrate.versioning import api
from flask_ppt2 import app, db

repo_uri = app.config["SQLALCHEMY_DATABASE_URI"]
repo = app.config["SQLALCHEMY_MIGRATE_REPO"]

db.create_all()
db.session.commit()
 
if not path.exists(repo):
    api.create(repo, 'database repository')
    api.version_control(repo_uri, repo)
else:
    api.version_control(repo_uri, repo, api.version(repo))
