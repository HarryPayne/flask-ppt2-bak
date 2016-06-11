# coding: utf-8
"""SQLAlchemy table classes and models.

We are using the SQLAlchemy ORM to model the data and Flask WTForms for REST
behavior and to control what users see. This module is all about the data
models.

There are five key data objects, and a table for each one:

    class Description, table description, one per project
        The description holds the information about a potential project:
        what it is for and what it will do, who wants it, who will
        pay, who are the stakeholders, who will do the work, what
        resources are involved, and how far along this project is
        in the process of turning an idea into a project that can
        be put into a schedule and executed.

    class Portfolio, table portfolio, one per project
        The portfolio holds the information allowing this potential
        project to be compared with other potential projects for the
        purpose of deciding which projects to put into the next planning
        cycle, which happens on a quarterly cycle. These include items
        from NASA's NPR 7120.5 (scope, complexity, visibility, risk,
        cost, and resources but not safety) plus budgeting window.

    class Project, table project, one per project
        The project contains information about a project in the execution
        phase.

    class Disposition, table disposition, optional, multiple per project
        The disposition records the outcome of the planning process for
        a given cycle:
            If given a green light when it should start (as
            a month on the calendar) and why.

            If not then why not and when we should come back to look at
            it again.

    class Comment, table comment, optional, multiple per project
        Record comments made on a project during the planning process
        by stakeholders.

This project is a rewrite of a project where all of the information about the
columns in the tables was stored in the database. Adding a new item of
metadata was as easy as adding a row to the table of attributes. Certain
naming conventions were followed to allow that to work. We kept the database
from that project; but moved most of the information about attributes into
the forms, which are in the forms module.

***** The naming convention *****

And we kept the naming convention: If data attribute foo has a value selected
from a list/controlled vocabulary:

    The choices will be stored in table "foolist",and class "Foolist". A
    foolist object will have attributes:

        fooID
            primary key
        fooDesc
            the short description shown in a drop down menu
        fooText
            an optional, longer description used to document the choices

    If attribute foo is an attribute of object Portfolio, and is
    one-to-one with a project, then the selected value's fooID will be
    stored in column portfolio.fooID. The selected choice object is
    available as Portfolio.foo (which is a SQLAlchemy ORM relationship).

    If one project can have many choices of foo, then there will be an
    association class "Foo" and table "foo" to represent those choices.
    A list of selected choice objects is available as Portfolio.foos
    (which is a SQLAlchemy ORM association_proxy). The naming convention
    leads to some bad names for this relationship, like "strategys" and
    "childs". Sorry about that, but don't fix them.

    And finally, if foo is one of the five main/working tables then the
    matching form in the forms module will be "Foo".
"""
from datetime import datetime
from dateutil.relativedelta import relativedelta
from sqlalchemy import (Column, Date, DateTime, ForeignKey,
                        Float, Integer, String, Text, text)
from sqlalchemy.ext.associationproxy import association_proxy
from sqlalchemy.orm import relationship, backref
import sqlalchemy.types as types
from sqlalchemy_utils import DateRangeType

from flask_ppt2 import app, db

Base = db.Model
DBmetadata = db.metadata

# A column type for fiscal epoch, useful for knowing which quarter you are in.

FISCAL_YEAR_OFFSET = app.config.get("FISCAL_YEAR_OFFSET")
class FiscalQuarterType(types.TypeDecorator):
    """Convert db epoch (UTC) to Fiscal epoch for display.
    
    Add an offset on the way out and subtract it on the way in. Actual dates
    will be wrong, but quarters will come out right. If the offset is 
    +3 months, then Oct 1 in the database comes out as Jan 1, i.e., the start 
    of quarter 1 the fiscal year.
    """
    impl = DateRangeType
    
    def process_result_value(self, value, dialect):
        # FIXME:
        # There is a problem in intervals which prevents it from noticing that
        # our intervals in Postgresql are closed_open, and should drop the last
        # day before returning an interval that is closed on both ends. For now
        # we hardwire it.
        if value:
            value.upper_inc = False
            if value.lower:
                value.lower += FISCAL_YEAR_OFFSET
                if value.lower:
                    value.upper = value.lower + relativedelta(months=3)
                else:
                    value.upper = value.lower + relativedelta(years=1)
            if not value.lower_inc:
                value.lower += relativedelta(days=1)
            if not value.upper_inc:
                value.upper -= relativedelta(days=1)
        return value
    
    def process_bind_param(self, value, dialect):
        if value:
            value.upper_inc = False
            if value.lower:
                value.lower -= FISCAL_YEAR_OFFSET
                if value.upper:
                    value.upper = value.lower + relativedelta(months=3)
                else:
                    value.upper = value.lower + relativedelta(years=1)
            if not value.lower_inc:
                value.lower -= relativedelta(days=1)
            if not value.upper_inc:
                value.upper += relativedelta(days=1)
        return value


# Table models. First controlled vocabulary list tables, then association 
# tables, then the working tables.

#*****Begin list/controlled vocabulary tables. **********
class Childlist(Base):
    __tablename__ = "childlist"
    info = {"label": "children"}

    childID = Column(Integer, primary_key=True, nullable=False)
    childDesc = Column(String(100), nullable=False, index=True, 
                       server_default=text("''"))

class Complexitylist(Base):
    __tablename__ = "complexitylist"
    info = {"label": "complexity"}

    complexityID = Column(Integer,
                          primary_key=True, server_default=text("'0'"))
    complexityDesc = Column(String(100), nullable=False, 
                            server_default=text("''"))
    complexityText = Column(Text, nullable=False)


class Costlevellist(Base):
    __tablename__ = "costlevellist"
    info = {"label": "cost level"}

    costlevelID = Column(Integer, primary_key=True, 
                         server_default=text("'0'"))
    costlevelDesc = Column(String(100), nullable=False, 
                           server_default=text("''"))
    costlevelText = Column(Text, nullable=False)


class Dispositionlist(Base):
    __tablename__ = "dispositionlist"
    info = {"label": "disposition"}

    dispositionID = Column(Integer, primary_key=True, 
                           server_default=text("'0'"))
    dispositionDesc = Column(String(100), server_default=text("''"))
    dispositionText = Column(Text, nullable=False)

class Driverlist(Base):
    __tablename__ = "driverlist"
    info = {"label": "driver"}

    driverID = Column(Integer, primary_key=True,
                       server_default=text("'0'"))
    driverDesc = Column(String(100), server_default=text("''"))
    driverText = Column(Text)

class Finallist(Base):
    __tablename__ = "finallist"
    info = {"label": "final state"}

    finalID = Column(Integer, primary_key=True, 
                     server_default=text("'0'"))
    finalDesc = Column(String(100), nullable=False, 
                       server_default=text("''"))
    finalText = Column(Text, nullable=False)


class Flavorlist(Base):
    __tablename__ = "flavorlist"
    info = {"label": "portfolio category"}

    flavorID = Column(Integer, primary_key=True, 
                      server_default=text("'0'"))
    flavorDesc = Column(String(100), nullable=False, 
                        server_default=text("''"))


class Fundingsourcelist(Base):
    __tablename__ = "fundingsourcelist"
    info = {"label": "funding source"}

    fundingsourceID = Column(Integer, primary_key=True, 
                             server_default=text("'0'"))
    fundingsourceDesc = Column(String(100), nullable=False, 
                               server_default=text("''"))
    fundingsourceText = Column(Text, nullable=False)


class Hostlist(Base):
    __tablename__ = "hostlist"
    info = {"label": "host"}

    hostID = Column(Integer, primary_key=True, 
                    server_default=text("'0'"))
    hostDesc = Column(String(100), nullable=False, 
                      server_default=text("''"))
    hostText = Column(Text, nullable=False)


class Initiativelist(Base):
    __tablename__ = "initiativelist"
    info = {"label": "initiative"}

    initiativeID = Column(Integer, primary_key=True, 
                          server_default=text("'0'"))
    initiativeDesc = Column(String(100), nullable=False, 
                            server_default=text("''"))
    initiativeText = Column(Text, nullable=False)


class Maturitylist(Base):
    __tablename__ = "maturitylist"

    maturityID = Column(Integer, primary_key=True, 
                        server_default=text("'0'"))
    maturityDesc = Column(String(100), nullable=False, 
                          server_default=text("''"))
    maturityText = Column(Text, nullable=False)


class Progresslist(Base):
    __tablename__ = "progresslist"
    info = {"label": "progress"}

    progressID = Column(Integer, primary_key=True, 
                        server_default=text("'0'"))
    progressDesc = Column(String(100), nullable=False, 
                          server_default=text("''"))
    progressText = Column(Text, nullable=False)


class Proj_visibilitylist(Base):
    __tablename__ = "proj_visibilitylist"
    info = {"label": "project visibility"}

    proj_visibilityID = Column(Integer, primary_key=True, 
                               server_default=text("'0'"))
    proj_visibilityDesc = Column(String(100), nullable=False,
                                  server_default=text("''"))
    proj_visibilityText = Column(Text, nullable=False)


class Risklevellist(Base):
    __tablename__ = "risklevellist"
    info = {"label": "risk level"}

    risklevelID = Column(Integer, primary_key=True, 
                         server_default=text("'0'"))
    risklevelDesc = Column(String(100), nullable=False, 
                           server_default=text("''"))
    risklevelText = Column(Text, nullable=False)


class Scopelist(Base):
    __tablename__ = "scopelist"
    info = {"label": "scope"}

    scopeID = Column(Integer, primary_key=True, 
                     server_default=text("'0'"))
    scopeDesc = Column(String(100), nullable=False, 
                       server_default=text("''"))
    scopeText = Column(Text, nullable=False)


class Sponsorlist(Base):
    __tablename__ = "sponsorlist"
    info = {"label": "sponsor"}

    sponsorID = Column(Integer, primary_key=True, 
                       server_default=text("'0'"))
    sponsorDesc = Column(String(100), nullable=False, 
                         server_default=text("''"))
    sponsorText = Column(Text, nullable=False)


class Stakeholderlist(Base):
    __tablename__ = "stakeholderlist"
    info = {"label": "stakeholder"}

    stakeholderID = Column(Integer, primary_key=True,
                           server_default=text("'0'"))
    stakeholderDesc = Column(String(100), nullable=False, 
                             server_default=text("''"))
    stakeholderText = Column(Text, nullable=False)


class Strategylist(Base):
    __tablename__ = "strategylist"
    info = {"label": "strategies"}

    strategyID = Column(Integer, primary_key=True, 
                        server_default=text("'0'"))
    strategyDesc = Column(String(100), nullable=False, 
                          server_default=text("''"))
    strategyText = Column(Text, nullable=False)

class Technologylist(Base):
    __tablename__ = "technologylist"
    info = {"label": "technology"}

    technologyID = Column(Integer, primary_key=True, 
                          server_default=text("'0'"))
    technologyDesc = Column(String(100), nullable=False, 
                            server_default=text("''"))
    technologyText = Column(Text, nullable=False)
    technologyRationale = Column(Text, nullable=False)


class Typelist(Base):
    __tablename__ = "typelist"
    info = {"label": "type"}

    typeID = Column(Integer, primary_key=True, 
                    server_default=text("'0'"))
    typeDesc = Column(String(100), nullable=False, 
                      server_default=text("''"))
    typeText = Column(Text, nullable=False)

class Visibilitylist(Base):
    __tablename__ = "visibilitylist"
    info = {"label": "visibility"}

    visibilityID = Column(Integer, primary_key=True, 
                          server_default=text("'0'"))
    visibilityDesc = Column(String(100), nullable=False, 
                            server_default=text("''"))
    visibilityText = Column(Text, nullable=False)

class Years(Base):
    __tablename__ = "years"

    year = Column(Integer, primary_key=True, server_default=text("'0'"))

class Calendaryears(Base):
    __tablename__ = "calendaryears"

    calendaryearID = Column(Integer, primary_key=True, 
                            server_default=text("'0'"))
    calendaryearDesc = Column(String(4), nullable=False, 
                              server_default=text("''"))

class Fiscalyears(Base):
    __tablename__ = 'fiscalyears'

    fiscalyearID = Column(Integer, primary_key=True, 
                          server_default=text("'0'"))
    fiscalyearDesc = Column(String(6), nullable=False, 
                            server_default=text("''"))

#     FISCAL_YEARS = [(y, str(y)) 
#                     for y in range(YEAR_RANGE_MIN, YEAR_RANGE_MAX)]
# 
#     @property
#     def serialize_options(cls):
#         return cls.FISCAL_YEARS

class Quarters(Base):
    __tablename__ = "quarters"

    quarterID = Column(Integer, primary_key=True, 
                       server_default=text("'0'"))
    quarterDesc = Column(String(12), nullable=False, 
                         server_default=text("''"))

class Months(Base):
    __tablename__ = "months"

    monthID = Column(Integer, primary_key=True, server_default=text("'0'"))
    monthDesc = Column(String(12), nullable=False, server_default=text("''"))
#*****End list/controlled vocabulary tables. **********

#*****Begin association tables. **********
class Child(Base):
    __tablename__ = "child"
    # Supports Description.childs association proxy
    projectID = Column(Integer, ForeignKey("description.projectID"),
                       primary_key=True, nullable=False, index=True,
                       server_default=text("'0'"))
    childID = Column(Integer, ForeignKey("childlist.childID"),
                       primary_key=True, nullable=False, index=True,
                       server_default=text("'0'"))

    description = relationship("Description",
                         backref=backref("childID",
                                         cascade="all, delete-orphan"))
    childlist = relationship("Childlist")

    def __init__(self, childlist=None, description=None):
        self.childlist = childlist
        self.description = description

class Driver(Base):
    __tablename__ = "driver"
    # Supports Description.drivers association proxy.
    projectID = Column(Integer, ForeignKey("description.projectID"),
                       primary_key=True, nullable=False, index=True,
                       server_default=text("'0'"))
    driverID = Column(Integer, ForeignKey("driverlist.driverID"),
                      primary_key=True, nullable=False, index=True,
                      server_default=text("'0'"))

    description = relationship("Description",
                    backref=backref("driverID",
                                     cascade="all, delete-orphan"))
    driverlist = relationship("Driverlist")

    def __init__(self, driverlist=None, description=None):
        self.driverlist = driverlist
        self.description = description

class Stakeholder(Base):
    __tablename__ = "stakeholder"
    # Supports Description.stakeholders association proxy
    projectID = Column(Integer, ForeignKey("description.projectID"),
                       primary_key=True, nullable=False, index=True,
                       server_default=text("'0'"))
    stakeholderID = Column(Integer,
                           ForeignKey("stakeholderlist.stakeholderID"),
                           primary_key=True, nullable=False, index=True,
                           server_default=text("'0'"))

    description = relationship("Description",
                          backref=backref("stakeholderID",
                                          cascade="all, delete-orphan"))
    stakeholderlist = relationship("Stakeholderlist", lazy="joined")

    def __init__(self, stakeholderlist=None, description=None):
        self.stakeholderlist = stakeholderlist
        self.description = description


class Strategy(Base):
    __tablename__ = "strategy"
    # Supports Portfolio.straegys association proxy
    projectID = Column(Integer, ForeignKey("portfolio.projectID"),
                       primary_key=True, nullable=False, index=True,
                       server_default=text("'0'"))
    strategyID = Column(Integer, ForeignKey("strategylist.strategyID"),
                        primary_key=True, nullable=False, index=True,
                        server_default=text("'0'"))

    portfolio = relationship("Portfolio",
                             backref=backref("strategyID",
                                             cascade="all, delete-orphan"))
    strategylist = relationship("Strategylist")

    def __init__(self, strategylist=None, portfolio=None):
        self.strategylist = strategylist
        self.portfolio = portfolio

#*****End association tables. **********

#*****Begin working tables. **********

class Comment(Base):
    __tablename__ = "comment"

    commentID = Column(Integer, primary_key=True, nullable=True, 
                       autoincrement=True)
    projectID = Column(Integer, ForeignKey("description.projectID"), 
                       nullable=False, index=True,
                       server_default=text("'0'"))
    comment = Column(Text, nullable=False)
    commentAuthor = Column(String(100),
                           nullable=True, index=True, 
                           server_default=text("''"))
    commentAuthored = Column(DateTime, onupdate=datetime.utcnow)
    commentEditor = Column(String(100),
                           nullable=True, index=True, 
                           server_default=text("''"))
    commentEdited = Column(DateTime, onupdate=datetime.utcnow)

    # Relationship to base table.
    t_description = relationship("Description", backref="comments")

class Description(Base):
    __tablename__ = "description"

    projectID = Column(Integer, primary_key=True)
    name = Column(String(100), nullable=False, index=True, 
                  server_default=text("''"))
    abstract = Column(Text, index=True)
    rationale = Column(Text)
    businesscase = Column(Text)
    dependencies = Column(Text)
    maturityID = Column(Integer, ForeignKey(Maturitylist.maturityID),
                        server_default=text("'0'"))
    proposer = Column(String(100), server_default=text("''"))
    customer = Column(String(100),server_default=text("''"))
    sponsorID = Column(Integer, ForeignKey(Sponsorlist.sponsorID),
                       nullable=True, index=True, server_default=text("'0'"))
    fundingsourceID = Column(Integer, 
                             ForeignKey(Fundingsourcelist.fundingsourceID),
                             nullable=True, server_default=text("'0'"))
    hostID = Column(Integer, ForeignKey(Hostlist.hostID),
                    nullable=True, index=True, server_default=text("'0'"))
    technologyID = Column(Integer, ForeignKey(Technologylist.technologyID),
                          info={"coerce": int},
                          nullable=True, server_default=None)
    typeID = Column(Integer, ForeignKey(Typelist.typeID),
                    nullable=True, server_default=text("'0'"))
    created = Column(Date, nullable=True)
    ended = Column(Date, nullable=True)
    finalID = Column(Integer, ForeignKey(Finallist.finalID),
                     nullable=True, index=True, server_default=text("'0'"))

    # We need a table-specific handle for these two generic columns since
    # otherwise the search will never get to just one column
    descriptionLastModified = Column(DateTime, onupdate=datetime.utcnow)
    descriptionLastModifiedBy = Column(String(100))

    # One to many relationships.
    maturity = relationship("Maturitylist")
    sponsor = relationship("Sponsorlist")
    fundingsource = relationship("Fundingsourcelist")
    host = relationship("Hostlist")
    technology = relationship("Technologylist")
    type = relationship("Typelist")
    final = relationship("Finallist")

    # Many to many relationships.
    childs = association_proxy("childID", "childlist")
    drivers = association_proxy("driverID", "driverlist")
    stakeholders = association_proxy("stakeholderID", "stakeholderlist")
    latest_dispositions = association_proxy("latest_dispositionID", "latest_list")

class Disposition(Base):
    __tablename__ = "disposition"

    projectID = Column(Integer, ForeignKey("description.projectID"), 
                       primary_key=True)
    disposedIn = Column(FiscalQuarterType, primary_key=True)
    reconsiderIn = Column(FiscalQuarterType)
    dispositionID = Column(Integer, 
                           ForeignKey(Dispositionlist.dispositionID),
                           index=True, server_default=text("'0'"))
    explanation = Column(Text, nullable=True)
    plannedFor = Column(DateRangeType)
    dispositionLastModified = Column(DateTime, onupdate=datetime.utcnow)
    dispositionLastModifiedBy = Column(String(100))

    # Many to one relationship.
    disposition = relationship("Dispositionlist")

    # Relationship to base table.
    #t_description = relationship("Description", backref="dispositions")


class Latest_disposition(Base):
    __tablename__ = "latest_disposition"
    projectID = Column(Integer, ForeignKey("description.projectID"), 
                       primary_key=True)
    disposedIn = Column(FiscalQuarterType)
    reconsiderIn = Column(FiscalQuarterType)
    latest_dispositionID = Column("dispositionID", Integer,
                                  ForeignKey(Dispositionlist.dispositionID),
                                  server_default=text("'0'"))
    explanation = Column(Text, nullable=True)
    plannedFor = Column(DateRangeType)
    latestDispositionLastModified = Column(DateTime, onupdate=datetime.utcnow)
    latestDispositionLastModifiedBy = Column(String(100))

    # Really a rich version of a child table, like Driver or Stakeholder
    
    description = relationship("Description",
                               backref=backref("latest_dispositionID"))
    latest_list = relationship("Dispositionlist")
    
    def __init__(self, latest_list=None, description=None):
        self.latest_list = latest_list
        self.description = description

class Portfolio(Base):
    __tablename__ = "portfolio"

    projectID = Column(Integer, ForeignKey("description.projectID"),
                       primary_key=True)
    flavorID = Column(Integer, ForeignKey("flavorlist.flavorID"),
                      nullable=True, index=True, server_default=text("'0'"))
    initiativeID = Column(Integer, ForeignKey("initiativelist.initiativeID"),
                          nullable=True, index=True, 
                          server_default=text("'0'"))
    scopeID = Column(Integer, ForeignKey("scopelist.scopeID"),
                     nullable=True, index=True, server_default=text("'0'"))
    complexityID = Column(Integer, ForeignKey("complexitylist.complexityID"),
                          nullable=True, index=True, 
                          server_default=text("'0'"))
    visibilityID = Column(Integer, ForeignKey("visibilitylist.visibilityID"),
                          nullable=True, index=True, 
                          server_default=text("'0'"))
    risklevelID = Column(Integer,
                         ForeignKey("risklevellist.risklevelID"),
                         nullable=True, index=True, 
                         server_default=text("'0'"))
    costlevelID = Column(Integer, ForeignKey("costlevellist.costlevelID"),
                         nullable=True, index=True, 
                         server_default=text("'0'"))
    rpu = Column(Float, nullable=True,
                 server_default=text("'0'"))
    budgetIn = Column(FiscalQuarterType)
    budgetInFY = Column(Integer,
                        info={"coerce": int},
                        nullable=True, index=True, server_default=None)
    budgetInQ = Column(Integer, nullable=True, server_default=text("'0'"))
    # We need a table-specific handle for these two generic columns since
    # otherwise the search will never get to just one column
    portfolioLastModified = Column(DateTime, onupdate=datetime.utcnow)
    portfolioLastModifiedBy = Column(String(100))

    # Many to one relationships.
    flavor = relationship("Flavorlist",
        backref=backref("portfolio",
                        lazy="dynamic"))
    initiative = relationship("Initiativelist",
        backref=backref("portfolio",
                        lazy="dynamic"))
    scope = relationship("Scopelist",
        backref=backref("portfolio",
                        lazy="dynamic"))
    complexity = relationship("Complexitylist",
        backref=backref("portfolio",
                        lazy="dynamic"))
    visibility = relationship("Visibilitylist",
        backref=backref("portfolio",
                        lazy="dynamic"))
    risklevel = relationship("Risklevellist",
        backref=backref("portfolio",
                        lazy="dynamic"))
    costlevel = relationship("Costlevellist",
        backref=backref("portfolio",
                        lazy="dynamic"))

    # Many to many relationship.
    strategys = association_proxy("strategyID", "strategylist")

    # Relationship to base table.
    descriptions = relationship("Description", backref="portfolio")

class Project(Base):
    __tablename__ = "project"

    projectID = Column(Integer, ForeignKey("description.projectID"),
                       primary_key=True, server_default=text("'0'"))
    project_url = Column(String(255), nullable=True, server_default=text("''"))
    progressID = Column(Integer, ForeignKey("progresslist.progressID"),
                        nullable=True, index=True, 
                        server_default=text("'0'"))
    proj_manager = Column(String(100),
                          nullable=True, index=True,
                           server_default=text("''"))
    tech_manager = Column(String(100),
                          nullable=True, index=True, 
                          server_default=text("''"))
    proj_visibilityID = Column(Integer, 
                               ForeignKey(
                                "proj_visibilitylist.proj_visibilityID"),
                               nullable=True, index=True, 
                               server_default=text("'0'"))
    startedOn = Column(Date, nullable=True, index=True)
    finishedOn = Column(Date, nullable=True, index=True)
    projectLastModified = Column(DateTime, onupdate=datetime.utcnow)
    projectLastModifiedBy = Column(String(100))

    # Many to one relationships.
    progress = relationship("Progresslist", backref="project")
    proj_visibility = relationship("Proj_visibilitylist", backref="project")

    # Relationship to base table.
    t_description = relationship("Description", backref="project")


#*****End working tables. **********
