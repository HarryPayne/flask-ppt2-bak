from dateutil.relativedelta import relativedelta
from datetime import datetime, timedelta
import os 
basedir = os.path.abspath(os.path.dirname(__file__))

SECRET_KEY = 'Kgg{9G8*jEoJeyKP6BkyTYGeM=vjtV2y2t#RpDH/QmvFhhPDnk'

WTF_CSRF_ENABLED = True
WTF_CSRF_SECRET_KEY = SECRET_KEY

#SQLALCHEMY_DATABASE_URI = "mysql://root:stormy@localhost/projects"
SQLALCHEMY_DATABASE_URI = "postgresql+psycopg2://payne:stormy@localhost/projects"
SQLALCHEMY_MIGRATE_REPO = os.path.join(basedir, '..', 'db_repository')
SQLALCHEMY_TRACK_MODIFICATIONS = False

# LDAP authentication and authorization by group roles
# Users whose user name matches a distinguished name under LDAP_SEARCH_BASE and
# are the right kind of member of the right kind of group are granted the role
LDAP_HOST = "localhost"
LDAP_SEARCH_BASE = "ou=people,o=test"
LDAP_USER_OBJECTS_RDN = "uid"
LDAP_GROUP_SEARCH_BASE = "ou=ZopeRoles,ou=groups,o=test"
LDAP_GROUP_OBJECT_FILTER = "objectclass=groupOfUniqueNames"
LDAP_GROUP_MEMBERS_FIELD = "uniquemember"
LDAP_GROUP_RDN = "cn"

# JWT options
# Expire after 10 hours
# TODO: get renewal working?
JWT_EXPIRATION_DELTA = timedelta(hours=10)
JWT_AUTH_HEADER_PREFIX  = "bearer"

# Offset to be added to calendar date to get FY date. Database dates are
# calendar dates.
FISCAL_YEAR_OFFSET = relativedelta(months=+3)    # FY2008 Q1 starts 10/01/2007
FISCAL_QUARTERS = ((0, u""), (1, u"Q1 (Fall)"), (2, u"Q2 (Winter)"), 
                   (3, u"Q3 (Spring)"), (4, u"Q4 (Summer)"))
YEAR_RANGE_MIN = 2004
YEAR_RANGE_MAX = datetime.now().year + 3

