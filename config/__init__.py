""" Configuration settings package

Configurations for dev, test, and prod environments are stored here. 
Make your choice by setting the PPT_ENVIRONMENT variable to "prod", "test", or
something else before loading the application. For example, here is the code
in run.py in the production environment:

#!bin/python
# Select an execution environment: "prod", "test", or "dev" (default).
import os
os.environ["PPT_ENVIRONMENT"] = "prod"

from flask_ppt2 import app
app.config["MINIFIED"] = False
app.run(debug=True)

"""