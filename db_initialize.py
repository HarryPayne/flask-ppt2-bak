#!bin/python
# Initialize tables containing choices for dropdown lists from json files in 
# the init folder. 

import json
from os import environ, path

environ["PPT_ENVIRONMENT"] = "test"

from flask_ppt2 import db
import flask_ppt2.alchemy_models as alch

# Use the naming convention to find tables of interest
LIST_TABLES = [getattr(alch, t.name.capitalize())
                    for t in alch.DBmetadata.sorted_tables
                    if t.name.endswith("list")]

for table in LIST_TABLES:
    # Get a table instance to obtain database table name.
    t = table()
    tablename = t.__class__.__tablename__
    if tablename == "childlist":
        # Not really metadata. More like history.
        continue

    # Read data from json file in init package/directory. Those files have a 
    # json literal object on each row.
    init_file_name = path.join("init", "{}.json".format(tablename))
    f = open(init_file_name, "r")
    lines = f.readlines()
    
    # delete() means truncate not drop
    db.session.query(table).delete()
    
    # Instantiate table row from json object and add to session
    for line in lines:
        choice_dict = json.loads(line)
        choice = table(**choice_dict)
        db.session.add(choice)
        
    db.session.commit()
    f.close()
    