# -*- coding: utf-8 -*-
"""
    flask_ppt2.auth.model
    ~~~~~~~~~~~~~~~~~~~~~
    User model and login form for the auth blueprint against an LDAP directory

    This module defines a User form for auth information in ldap. Authorization
    information comes from ldap groups that the user is in. 
    
    It also defines a wtforms form for the login form. This ensures that login
    is protected against csrf attacks.
    
    @author: payne
"""
from ldap3 import Server, Connection, ALL, SUBTREE
from ldap3.core.exceptions import LDAPBindError
from sqlalchemy import (Column, String)
from wtforms import StringField, PasswordField, validators

from flask_ppt2 import app, db
from flask_ppt2.forms import ModelForm

Base = db.Model

config = app.config
LDAP_HOST = config.get("LDAP_HOST")
LDAP_SEARCH_BASE = config.get("LDAP_SEARCH_BASE")
LDAP_GROUP_SEARCH_BASE = config.get("LDAP_GROUP_SEARCH_BASE")
LDAP_USER_OBJECTS_RDN = config.get("LDAP_USER_OBJECTS_RDN")
LDAP_GROUP_OBJECT_FILTER = config.get("LDAP_GROUP_OBJECT_FILTER")
LDAP_GROUP_MEMBERS_FIELD = config.get("LDAP_GROUP_MEMBERS_FIELD")
LDAP_GROUP_RDN = config.get("LDAP_GROUP_RDN")



def ldap_fetch(username=None, name=None, passwd=None):
    """Open a connection to the directory and try to authenticate with the 
    given username and password. If you get in, search for attributes from 
    your user record, and search again for the names of the groups you are 
    in, if those groups are in the right place in the directory.
    """
    try:
        server = Server(LDAP_HOST, get_info=ALL)
        dn = "{0}={1},{2}".format(LDAP_USER_OBJECTS_RDN, 
                                  username, 
                                  LDAP_SEARCH_BASE)

        if username is not None and passwd is not None:
            conn = Connection(server, dn, passwd, auto_bind=True)
        else:
            conn = Connection(server, auto_bind=True)
        conn.search(LDAP_SEARCH_BASE, 
                    '({0}={1})'.format(LDAP_USER_OBJECTS_RDN, 
                                       username),
                    search_scope=SUBTREE,
                    attributes=[LDAP_USER_OBJECTS_RDN, 
                                'cn', 'givenName', 'sn', 'mail'],
                    get_operational_attributes=True)
        r = conn.entries
        conn.search(LDAP_GROUP_SEARCH_BASE,
                    "(&({0})({1}={2}))".format(LDAP_GROUP_OBJECT_FILTER, 
                                               LDAP_GROUP_MEMBERS_FIELD, 
                                               dn),
                    search_scope=SUBTREE,
                    attributes=[LDAP_GROUP_RDN],
                    get_operational_attributes=True)
        g = conn.entries
        
        return {
            'username': r[0][LDAP_USER_OBJECTS_RDN][0],
            'name': r[0]['cn'][0],
            "givenName": r[0]["givenname"][0] if "givenname" in r[0] else None,
            "sn": r[0]["sn"][0],
            "mail": r[0]["mail"][0] if "mail" in r[0] else None,
            "roles": [item[LDAP_GROUP_RDN][0] for item in g 
                       if LDAP_GROUP_RDN in item]
        }
    except LDAPBindError:
        return None


class User(Base):
    """The user form, which returns some user attributes and the names of 
    groups you are in, which corresponds to the roles you have.
    """
    username = Column(String(64), primary_key=True)
    
    def __init__(self, username=None, name=None, passwd=None, roles=None, 
                 mail=None):
        self.username = username
        self.name = name
        self.roles = roles
        self.mail = mail
        self.active = False
        ldapres = ldap_fetch(username=username, name=name, passwd=passwd)

        if ldapres is not None:
            self.username = ldapres["username"]
            self.roles = ldapres["roles"]
            self.name = ldapres["name"]
            self.firstname = ldapres["givenName"]
            self.lastname = ldapres["sn"]
            self.mail = ldapres["mail"]
            self.active = True

    def is_active(self):
        return True
    
    def is_anonymous(self):
        return False
    
    def is_authenticated(self):
        return True

    def get_id(self):
        return self.username
    
    def get_user(self):
        return {"username": self.username,
                "name": self.name,
                "firstname": self.firstname,
                "lastname": self.lastname,
                "mail": self.mail,
                "roles": self.roles,
                "is_active": self.active}
    
    def get_roles(self):
        return self.roles

    def __repr__(self):
        return '<User %r>' % (self.username)

class LoginForm(ModelForm):
    """Flask WTF form for the login screen"""
    username = StringField("Username", [validators.Length(min=2, max=64)])
    password = PasswordField("Password", [validators.Required()])

