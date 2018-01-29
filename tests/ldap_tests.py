"""Unit tests for ldap/login functionality"""
import os
import sys
from builtins import classmethod

os.environ["PPT_ENVIRONMENT"] = "test"
sys.path.insert(0, os.path.abspath(".."))

import unittest
from ldap3 import Server, Connection, ALL, SUBTREE

from flask_ppt2 import app
import pydevd

class PPTLDAPTests(unittest.TestCase):
    
    @classmethod
    def setUpClass(cls):
        pass
    
    @classmethod
    def tearDownClass(cls):
        pass
    
    def setUp(self):
        self.app = app.test_client()
        self.app.testing = True
    
    def tearDown(self):
        pass
    
    def test_server_connection_anonymous(self):
        """Bind anonymously to the directory"""
        server = Server(app.config["LDAP_HOST"], get_info=ALL)
        conn = Connection(server, auto_bind=True)
        dn = "{0}={1},{2}".format(app.config["LDAP_USER_OBJECTS_RDN"], 
                                  "testadmin", 
                                  app.config["LDAP_SEARCH_BASE"])
        conn.search(app.config["LDAP_SEARCH_BASE"], '(uid=testadmin)', 
                    search_scope=SUBTREE,
                    attributes=[app.config["LDAP_USER_OBJECTS_RDN"], 
                                'cn', 'givenName', 'sn', 'mail'],
                    get_operational_attributes=True)
        r = conn.entries
        d = r[0].entry_get_attributes_dict()
        self.assertEqual(r[0].entry_get_dn(), 'uid=testadmin,ou=People,o=test')
        self.assertEqual(d["givenName"], ["test"])
        conn.search(app.config["LDAP_GROUP_SEARCH_BASE"],
                    "(&({0})({1}={2}))".format(app.config["LDAP_GROUP_OBJECT_FILTER"], 
                                               app.config["LDAP_GROUP_MEMBERS_FIELD"], 
                                               dn),
                    search_scope=SUBTREE,
                    attributes=[app.config["LDAP_GROUP_RDN"]],
                    get_operational_attributes=True)
        g = conn.entries
        groups = [item[app.config["LDAP_GROUP_RDN"]].value for item in g]
        self.assertTrue("Manager" in groups)
        self.assertTrue("Curator" in groups)
        self.assertTrue("ContentProvider" in groups)
        conn.unbind()
        
    def test_server_connection_auth(self):
        """Bind as the testadmin user."""
        server = Server(app.config["LDAP_HOST"], get_info=ALL)
        dn = "{0}={1},{2}".format(app.config["LDAP_USER_OBJECTS_RDN"], 
                                  "testadmin", 
                                  app.config["LDAP_SEARCH_BASE"])
        conn = Connection(server, dn, "testadmin", auto_bind=True)
        conn.search(app.config["LDAP_SEARCH_BASE"], '(uid=testadmin)', 
                    search_scope=SUBTREE,
                    attributes=[app.config["LDAP_USER_OBJECTS_RDN"], 
                                'cn', 'givenName', 'sn', 'mail'],
                    get_operational_attributes=True)
        r = conn.entries
        d = r[0].entry_get_attributes_dict()
        self.assertEqual(r[0].entry_get_dn(), 'uid=testadmin,ou=People,o=test')
        self.assertEqual(d["givenName"], ["test"])
        conn.search(app.config["LDAP_GROUP_SEARCH_BASE"],
                    "(&({0})({1}={2}))".format(app.config["LDAP_GROUP_OBJECT_FILTER"], 
                                               app.config["LDAP_GROUP_MEMBERS_FIELD"], 
                                               dn),
                    search_scope=SUBTREE,
                    attributes=[app.config["LDAP_GROUP_RDN"]],
                    get_operational_attributes=True)
        g = conn.entries
        groups = [item[app.config["LDAP_GROUP_RDN"]][0] for item in g]
        self.assertTrue("Manager" in groups)
        self.assertTrue("Curator" in groups)
        self.assertTrue("ContentProvider" in groups)
        conn.unbind()
    
    def test_ldap_fetch_hit(self):
        """Test ldap_fetch of testadmin user with valid password"""
        from flask_ppt2.auth.models import ldap_fetch
        from ldap3 import LDAPKeyError
        u = ldap_fetch("testadmin", passwd="testadmin")
        self.assertIsNotNone(u)
        self.assertEqual(u["username"], "testadmin")
        self.assertEqual(len(u["roles"]), 3)
        self.assertIsNone(u["mail"])
        self.assertEqual(u["givenName"], "test")
        self.assertEqual(u["sn"], "admin")
     
    def test_ldap_fetch_miss(self):
        """Test ldap_fetch of testadmin user with wrong password"""
        from flask_ppt2.auth.models import ldap_fetch
        u = ldap_fetch("nottestadmin", passwd="nottestadmin")
        self.assertIsNone(u)
        
        
if __name__ == '__main__':
    unittest.main(warnings="ignore")