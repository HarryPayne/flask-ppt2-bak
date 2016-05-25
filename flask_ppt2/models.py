"""User model with LDAP authentication and authorization."""
from flask_login import UserMixin
from ldap3 import Server, Connection, ALL, SUBTREE, LDAPBindError

from flask_ppt2 import app

config = app.config
LDAP_HOST = config.get("LDAP_HOST")
LDAP_SEARCH_BASE = config.get("LDAP_SEARCH_BASE")
LDAP_GROUP_SEARCH_BASE = config.get("LDAP_GROUP_SEARCH_BASE")
LDAP_USER_OBJECTS_RDN = config.get("LDAP_USER_OBJECTS_RDN")
LDAP_GROUP_OBJECT_FILTER = config.get("LDAP_GROUP_OBJECT_FILTER")
LDAP_GROUP_MEMBERS_FIELD = config.get("LDAP_GROUP_MEMBERS_FIELD")
LDAP_GROUP_RDN = config.get("LDAP_GROUP_RDN")

def ldap_fetch(uid=None, name=None, passwd=None):
    try:
        server = Server(LDAP_HOST, get_info=ALL)
        dn = "{0}={1},{2}".format(LDAP_USER_OBJECTS_RDN, uid, LDAP_SEARCH_BASE)

        if uid is not None and passwd is not None:
            conn = Connection(server, dn, passwd, auto_bind=True)
        else:
            conn = Connection(LDAP_HOST, auto_bind=True)
        conn.search(LDAP_SEARCH_BASE, 
                    '({0}={1})'.format(LDAP_USER_OBJECTS_RDN, uid),
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
            'uid': r[0][LDAP_USER_OBJECTS_RDN][0],
            'name': r[0]['cn'][0],
            "givenName": r[0]["givenname"][0] if "givenname" in r[0] else None,
            "sn": r[0]["sn"][0],
            "mail": r[0]["mail"][0] if "mail" in r[0] else None,
            "groups": [item[LDAP_GROUP_RDN][0] for item in g 
                       if LDAP_GROUP_RDN in item]
        }
    except LDAPBindError:
        return None

class User(UserMixin):
    def __init__(self, uid=None, name=None, passwd=None, groups=None, mail=None):
        self.uid = uid
        self.name = name
        self.groups = groups
        self.mail = mail
        self.active = False
        ldapres = ldap_fetch(uid=uid, name=name, passwd=passwd)

        if ldapres is not None:
            self.uid = ldapres["uid"]
            self.groups = ldapres["groups"]
            self.name = ldapres["name"]
            self.firstname = ldapres["givenName"]
            self.lastname = ldapres["sn"]
            self.mail = ldapres["mail"]
            self.active = True

    def is_active(self):
        return self.active

    def get_id(self):
        return self.uid
    
    def get_user(self):
        return {"uid": self.uid,
                "name": self.name,
                "firstname": self.firstname,
                "lastname": self.lastname,
                "mail": self.mail,
                "groups": self.groups,
                "is_active": self.active}

    def __repr__(self):
        return '<User %r>' % (self.uid)

