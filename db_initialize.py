#!bin/python
# Initialize tables containing choices for dropdown lists from json files in 
# the init folder. 

import json
import os.path

from config.test_settings import SQLALCHEMY_DATABASE_URI, SQLALCHEMY_MIGRATE_REPO
from flask_ppt2 import db
import flask_ppt2.alchemy_models as alch

LIST_TABLES = [getattr(alch, t.name.capitalize())
                    for t in alch.DBmetadata.sorted_tables
                    if t.name.endswith("list")]

# LIST_TABLES = [alch.Strategylist]
for table in LIST_TABLES:
    # get an instance
    t = table()
    tablename = t.__class__.__tablename__
    if tablename == "childlist":
        continue
    if tablename == "technologylist":
        t = table()
    init_file_name = os.path.join("init", "{}.json".format(tablename))
    f = open(init_file_name, "r")
    lines = f.readlines()
    # truncate first
    db.session.query(table).delete()
    for line in lines:
        choice_dict = json.loads(line)
        choice = table(**choice_dict)
        db.session.add(choice)
    db.session.commit()
    f.close()
    