import os
os.environ["PPT_ENVIRONMENT"] = "prod"

import sys
sys.path.insert(0, '/Users/payne/git/flask-ppt2')

from flask_ppt2 import app as application
application.secret_key = '9dL36YDXzHhKLdJNTnbyHc6^6Yb#j(G6h>=*8F9HLzJgpubLuH+cDvdMP3H33qos,7b%*3>2K83wiw+q'
application.config["DEBUG"] = False
application.config["MINIFIED"] = False