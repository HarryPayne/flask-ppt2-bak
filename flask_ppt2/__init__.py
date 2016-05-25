import os
from datetime import datetime
from flask import Flask
from flask_jwt import JWT
from flask_wtf.csrf import CsrfProtect
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager
from flask_cors import CORS
import wtforms_json

app = Flask(__name__)

# Make environment specific choice 
if os.environ["PPT_ENVIRONMENT"] == "prod":
    app.config.from_pyfile('../config/settings_prod.py')
elif os.environ["PPT_ENVIRONMENT"] == "test":
    app.config.from_pyfile('../config/settings_test.py')
else:
    app.config.from_pyfile('../config/settings_dev.py')
    
app.secret_key = app.config["SECRET_KEY"]

# csrf = CsrfProtect()
# csrf.init_app(app)
db = SQLAlchemy(app)
lm = LoginManager()
lm.init_app(app)
cors = CORS(app)
wtforms_json.init()

# authentication/login form methods. We use flask_jwt for authentication, and
# send out a JSON web token that is stored in the client and sent back with
# every request. The authentication back end is LDAP. We send out LDAP groups
# the user is in for use in role-based authorization on the front end (what to
# show the user). We do check the directory again when handling each request.

def authenticate(username, password):
    """Try authenticating with given username and password."""
    user = models.User(uid=username, passwd=password)
    if user.active is not False:
        return user

def identity(payload):
    """Return user object referred to in payload."""
    userid = payload["uid"] or None
    return models.User(uid=userid)

jwt = JWT(app, authenticate, identity)

@jwt.jwt_payload_handler
def make_payload(user):
    """ Build JWT payload from user model."""
    iat = datetime.utcnow()
    exp = iat + app.config.get('JWT_EXPIRATION_DELTA')
    nbf = iat + app.config.get('JWT_NOT_BEFORE_DELTA')
    return {
            "identity": user.get_user(),
            "iat": iat,
            "exp": exp,
            "nbf": nbf
        }

from flask_ppt2 import models, views

