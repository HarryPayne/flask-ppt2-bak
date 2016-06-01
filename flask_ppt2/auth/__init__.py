"""Module for csrf protected auth against an ldap server.

This module defines an auth Blueprint for handling the authentication and
authorization process. An ldap directory holds authentication credentials,
and authorization is based on group membership in certain ldap groups. Look
in the models module for that code.

The purpose is to provide a way to CSRF protect the login form so that 
protection can be site wide for all POST requests. 
"""
from flask import (abort, Blueprint, flash, g, jsonify, redirect,
                   render_template, request, url_for)
from flask_login import UserMixin, login_user, logout_user, login_required,\
    current_user
from flask_jwt import current_identity, jwt_required

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
    
#     form = LoginForm().from_json(request.json)
#     if form.validate():
# 
#         user = User(username=form.username.data, passwd=form.password.data)
#         if user.active is not False:
#             login_user(user)
#             return user
# 
#     abort(400)

@app.route("/logout", methods=["GET", "POST"])
@jwt_required()
def logout():
    """ Logout handler."""
    logout_user()
    return "You are logged out"
