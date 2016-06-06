""" App initialization

This module depends configuration from a file, and an environment variable is
examined to see whether we are executing in the dev, test, or prod environment.

This module loads and initializes a number of extensions, notably
    * The database connection 
    * CsrfProtect, which requires all POST requests to have a csrf token
    * JWT for authentication, and for sending user information, like roles,
        out to the client in a secure way, and 
    * Flask-Principal for role based authorization
"""
import os
from datetime import datetime
from flask import Flask, g
from flask_cors import CORS
from flask_jwt import current_app, JWT
from flask_login import current_user, LoginManager
from flask_principal import (AnonymousIdentity, Identity, identity_changed,
                             identity_loaded, Principal, RoleNeed)
from flask_sqlalchemy import SQLAlchemy
from flask_wtf.csrf import CsrfProtect 
import wtforms_json

app = Flask(__name__)

# Make environment specific choice of configuration
if os.environ["PPT_ENVIRONMENT"] == "prod":
    app.config.from_pyfile('../config/settings_prod.py')
elif os.environ["PPT_ENVIRONMENT"] == "test":
    app.config.from_pyfile('../config/settings_test.py')
else:
    app.config.from_pyfile('../config/settings_dev.py')
    
app.secret_key = app.config["SECRET_KEY"]

# Load/initialize extensions

# CsrfProtect is for csrf protecting POST requests that do not contain a form.
# By initializing it, all POST requests will need send an X-CSRFToken header
# to be allowed to connect. 
csrf = CsrfProtect()
csrf.init_app(app)

cors = CORS(app)
db = SQLAlchemy(app)
lm = LoginManager()
lm.init_app(app)
principals = Principal(app)
wtforms_json.init()

# authentication/login form methods. We use flask_jwt for authentication, and
# send out a JSON web token that is stored in the client and sent back with
# every request. The authentication back end is LDAP. We send out LDAP groups
# the user is in for use in role-based authorization on the front end (what to
# show the user). We do check the directory again when handling each request.

from flask_ppt2.auth.models import User
def authenticate(username, password):
    """Try authenticating with given username and password."""
    user = User(username=username, passwd=password)
    if user.active is not False:
        return user

def identity_loader(payload):
    """Return user object referred to in payload."""
    username = payload["identity"]["username"] or None
    current_user = User(username=username)
    identity = Identity(username)
    if hasattr(current_user, "roles"):
        for role in current_user.roles:
            identity.provides.add(RoleNeed(role))
    identity_changed.send(current_app._get_current_object(),
                          identity=identity)
    return current_user

jwt = JWT(app, authenticate, identity_loader)

@jwt.jwt_payload_handler
def make_payload(user):
    """Build JWT payload from user model."""
    iat = datetime.utcnow()
    exp = iat + app.config.get('JWT_EXPIRATION_DELTA')
    nbf = iat + app.config.get('JWT_NOT_BEFORE_DELTA')
    return {
            "identity": user.get_user(),
            "iat": iat,
            "exp": exp,
            "nbf": nbf
        }

from flask_ppt2 import views
from flask_ppt2.auth import auth
app.register_blueprint(auth)

