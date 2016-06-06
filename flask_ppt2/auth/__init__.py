"""Module for csrf protected auth against an ldap server.

This module defines an auth Blueprint for handling the authentication and
authorization process. An ldap directory holds authentication credentials,
and authorization is based on group membership in certain ldap groups. Look
in the models module for that code.

The purpose is to provide a way to CSRF protect the login form so that 
protection can be site wide for all POST requests. 
"""
from flask import (abort, Blueprint, flash, g, jsonify, redirect,
                   render_template, request, session, url_for)
from flask_login import UserMixin, login_user, logout_user, login_required,\
    current_user
from flask_jwt import current_app, current_identity, jwt_required
from flask_principal import Identity, identity_changed, AnonymousIdentity

from flask_ppt2 import app, db, lm
from flask_ppt2.auth.models import User, LoginForm

auth = Blueprint('auth', __name__)

@auth.before_request
def get_current_user():
    g.user = current_user
    
@lm.user_loader
def load_user(username):
    return User(username=username)

@auth.route('/', methods=["POST"])
@auth.route('/index', methods=["POST"])
def index():
    """Render and return the only page sent from the back end."""
    return render_template('index.html',
                           title='Home',
                           minified=app.config["MINIFIED"])

@auth.route('/getLoginToken', methods=["POST"])
def getLoginToken():
    """Return csrf token for login form"""
    # Instantiate the form and send back the csrf token for rendering
    # the form at the client end.
    form = LoginForm()
    csrf_token = form.csrf_token.current_token
    return jsonify({"csrf_token": csrf_token})
    
@app.route("/logout", methods=["GET", "POST"])
@jwt_required()
def logout():
    """ Logout handler."""
    logout_user()
    
    # Remove session keys set by Flask-Principal.
    for key in ('identity.name', 'identity.auth_type'):
        session.pop(key, None)
    
    # Tell Flask-Principal that the user is anonymous now.
    identity_changed.send(current_app._get_current_object(),
                         identity=AnonymousIdentity())
    
    return "You are logged out"
