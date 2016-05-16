#!bin/python
# Create all of the tables for the SQLAlchemy models.
# You need to create the database first, though.

import os.path
from flask_sqlalchemy import SQLAlchemy
from migrate.versioning import api
from config.settings import SQLALCHEMY_DATABASE_URI, SQLALCHEMY_MIGRATE_REPO
from flask_ppt2 import db

db.create_all()
db.session.commit()

# if not os.path.exists(SQLALCHEMY_MIGRATE_REPO):
#     api.create(SQLALCHEMY_MIGRATE_REPO, 'database repository')
#     api.version_control(SQLALCHEMY_DATABASE_URI, SQLALCHEMY_MIGRATE_REPO)
# else:
#     api.version_control(SQLALCHEMY_DATABASE_URI, SQLALCHEMY_MIGRATE_REPO, api.version(SQLALCHEMY_MIGRATE_REPO))