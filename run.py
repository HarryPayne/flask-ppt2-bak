#!bin/python
# Select an execution environment: "prod", "test", or "dev" (default).
import os
os.environ["PPT_ENVIRONMENT"] = "dev"

from flask_ppt2 import app
app.config["MINIFIED"] = False
app.run(debug=True)
