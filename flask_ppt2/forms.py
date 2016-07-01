import calendar
from datetime import datetime, date
from intervals import DateInterval
import re

from flask_wtf import Form
from sqlalchemy.inspection import inspect
from wtforms import (StringField, DateField, DateTimeField,
                     DecimalField, TextAreaField)
from wtforms_alchemy import model_form_factory 
from wtforms_alchemy.fields import (QuerySelectField, 
                                    QuerySelectMultipleField)
from wtforms_components import read_only
from wtforms_components import DateIntervalField
from wtforms_components.widgets import ReadOnlyWidgetProxy
from wtforms.validators import Required
from flask_ppt2 import app, db
import flask_ppt2.alchemy_models as alch

BaseModelForm = model_form_factory(Form)

FISCAL_YEAR_OFFSET = app.config.get("FISCAL_YEAR_OFFSET")
FISCAL_QUARTERS = app.config.get("FISCAL_QUARTERS")
YEAR_RANGE_MIN = app.config.get("YEAR_RANGE_MIN")
YEAR_RANGE_MAX = app.config.get("YEAR_RANGE_MAX")

class ModelForm(BaseModelForm):
    @classmethod
    def get_session(cls):
        return db.session

class FormlyAttributes:
    """Mixin class for forms to generate a list of form field descriptions.

    Make a list of json-serializable objects to carry the field properties out
    to the front end. The objects are in angular-formly format and contain
    these properties:

        key            attribute name
        type           form field class name
        read_only      flag for computed attributes.
        required       mandatory field
        label          field label
        description    help text for the field
        options        choices for QuerySelect and QuerySelectMultiple
                         fields. Each option is an object with attributes
                         "id" and "label". If the field has no choices
                         then the field will not have an options attr.
        table          table name where data lives

    The order of the objects is the same as the order in which they appear in
    the form class, which is intended to be the order in which they appear on
    the page in the front end.
    """
    def formly_attributes(self, model_prefix=""):
        """Return a list of angular-formly fields for the form."""
        model = inspect(self.Meta.model)
        attrs = []
        # get keys from the form to preserve order
        for key in self._fields.keys():
            if key == "csrf_token":
                continue
            field = self._fields[key]
            if key in model.columns.keys():
                attrs.append(self._get_attr_from_column(key, field,
                                                        model, attrs))
            elif key in model.relationships.keys():
                attrs.append(self._get_attr_from_relationship(key, field,
                                                              model, attrs))
            else:
                # Then what do we have?
                try:
                    # See what table they came from if the data for this field
                    # come from an association_proxy. By naming convention,
                    # get the meaningful key by replacing a final "s" with
                    # "ID". And the options are a tuple where we only care 
                    # about the second.
                    options = self.get_options_from_factory(key, field.query_factory)
                    attr = self._get_attr_base(key, field, model)
                    opt = attr["templateOptions"]
                    opt["options"] = options
                    opt["valueProp"] = "id"
                    opt["labelProp"] = "desc"
                    attrs.append(attr)
                except:
                    pass

        return attrs

    def _field_is_readonly(self, field):
        """Return True if field has readonly widget."""
        return isinstance(field.widget, ReadOnlyWidgetProxy)
    
    def _find_info(self, key, field, model):
        """ Poke around for info dict and return it or throw error."""
        try:
            column = model.mapper.attrs[key]
            return column._orig_columns[0].info
        except:
            pass

        try:
            column = model.mapper.attrs[key]
            return column.info
        except:
            pass

        return getattr(field.meta.model, key).info
    
    def _get_attr_base(self, key, field, model):
        """Start building a formly attribute, omitting options."""
        attr = dict()
        attr["key"] = key
        opt = dict()
        opt["label"] = field.label.text if hasattr(field, "label") else key
        opt["description"] = field.description
        opt["disabled"] = isinstance(field.widget, ReadOnlyWidgetProxy)
        opt["required"] = field.flags.required
        if field.type == "QuerySelectMultipleField":
            opt["multiple"] = True
        attr["templateOptions"] = opt
        attr = self._get_type_from_field(field, attr)
#         attr["type"] = field.type
        return attr

    def _get_attr_from_column(self, key, field, model, attrs):
        """Return formly attribute properties from a column as dict."""
        attr = self._get_attr_base(key, field, model)
        try:
            opt = attr["templateOptions"]
            opt["options"] = self.get_options_from_factory(key, field.query_factory)
            opt["valueProp"] = "id"
            opt["labelProp"] = "desc"
            if field.type == "QuerySelectMultipleField":
                opt["multiple"] = True
        except:
            pass
        return attr

    def _get_attr_from_relationship(self, key, field, model, attrs):
        """Return formly attribute properties from a relationship as dict."""
        # Try matching a backref to a column
        attr = self._get_attr_base(key, field, model)
        if field.type.startswith("QuerySelect"):
            opt = attr["templateOptions"]
            opt["options"] = self.get_options_from_factory(key, field.query_factory)
            opt["valueProp"] = "id"
            opt["labelProp"] = "desc"
            if field.type == "QuerySelectMultipleField":
                opt["multiple"] = True
            return attr
        else:
            return None

    def get_options_from_factory(self, key, query_factory):
        """Convert query_factory tuples into Bootstrap select objects."""
        choices = query_factory().all()
        return self.get_options_from_list(key, choices)

    def get_options_from_list(self, key, choices):
        """Convert list of option objects into Bootstrap select objects."""
        if len(choices):
            # Look for choices from the table where key is linked to the
            # primary key.
            try:
                root = key[:-1]      # take off trailing "s"
                return [{"id": getattr(item, "{}ID".format(root)),
                         "desc": getattr(item, "{}Desc".format(root))}
                        for item in choices]
            except:
                pass

            # Look for choices from an association_proxy, which will have
            # objects from a different table. Look at the first object to see
            # where it came from.
            try:
                data_tablename = choices[0].__class__.__tablename__
                root = re.sub("list\\b", "", data_tablename)
                id_name = "{}ID".format(root)
                desc_name = "{}Desc".format(root)
                return [{"id": getattr(c, id_name),
                         "desc": getattr(c, desc_name)}
                        for c in choices]
            except:
                return []
        else:
            return []

    def _get_type_from_field(self, field, attr):
        opt = attr["templateOptions"]
        if field.type == "StringField":
            if self._field_is_readonly(field):
                attr["type"] = "display"
                del opt["description"]
            else:
                attr["type"] = "input"
                opt["type"] = "text"
                attr["defaultValue"] = ""
        elif field.type == "TextAreaField":
            if self._field_is_readonly(field):
                attr["type"] = "displayTextArea"
                del opt["description"]
            else:
                attr["type"] = "input"
                attr["type"] = "textarea"
                opt["rows"] = 8
                opt["cols"] = 80
                attr["defaultValue"] = ""
        elif field.type == "IntegerField":
            attr["type"] = "input"
            opt["type"] = "number"
            attr["defaultValue"] = 0
        elif field.type == "DateTimeField":
            if self._field_is_readonly(field):
                attr["type"] = "displayTimestamp"
                del opt["description"]
            else:
                attr["type"] = "timestamp"
                opt["type"] = "timestamp"
                attr["defaultValue"] = ""
        elif field.type == "DateField":
            if self._field_is_readonly(field):
                attr["type"] = "date"
                del opt["description"]
            else:
                attr["type"] = "datepicker"
                opt["type"] = "text"
                opt["datepickerPopup"] = 'MM/dd/yyyy'
                attr["defaultValue"] = ""
        elif field.type == "QuerySelectField":
            attr["type"] = "select"
            attr["defaultValue"] = 0
        elif field.type == "QuerySelectMultipleField":
            attr["type"] = "select"
            # Add a "multiple" attribute to the field
            attr["ngModelAttrs"] = {"multiple": {"attribute": "multiple"}}
            attr["defaultValue"] = []
        elif field.type == "DecimalField":
            attr["type"] = "input"
            opt["type"] = "number"
            attr["defaultValue"] = ""
        elif field.type in ["DateIntervalField"]:
            attr["type"] = "daterange"
            attr["defaultValue"] = ""
        
        return attr
            

class DataSerializer:
    """Mixin form class to return serializable form data as dict."""
    def serialize_data(self):
        """Get data from a bound form and return as dict.

        Change date, datetime, and daterange into isoformat.

        Change _AssociationList of objects into a list of dictionaries
        with keys "id" and "desc" for use as Bootstrap select options.
        These are for QuerySelectMultipleField's. Change the key (name)
        from "fooID" to "foos", following the naming convention.

        Similar treatment for lists of objects for QuerySelectField's
        (not multiple). Name changed from "fooID" to "foo".
        
        Dates in the database are assumed to be UTC. Send them out as
        found and convert to local time on the client. Add a "Z" to
        the output from isoformat() to tell the client to treat the
        strings as UTC.
        
        For QuerySelect fields, take the descriptions associated with the
        selected values and stick them into a field named fooDesc. On the
        front end, use that for display.
        """
        output = {}
        for key in self._fields.keys():
            if key == "csrf_token":
                continue
            data = self.data[key]
            
            if type(data) == datetime:
                data = "{}Z".format(data.isoformat())
            elif type(data) == date:
                data = "{}".format(data.isoformat())
            elif type(data) == DateInterval:
                interval = data
                data = "{}/{}".format(interval.lower.isoformat(),
                                      interval.upper.isoformat())
            elif (getattr(self, key).type == "QuerySelectMultipleField"):
                # Then the value is a list of list table objects from some
                # table other than the one key is from. List value can be
                # None.
                if len(data):
                    options = self.get_options_from_list(key, data)
                    data = [option["id"] for option in options]
                    desc = ", ".join([option["desc"] for option in options])
                else:
                    data = None
                    desc = ""
                output["{}Desc".format(key)] = desc

            elif getattr(self, key).type == "QuerySelectField":
                # Promote integer value to choice selection
                if data:
                    options = self.get_options_from_list(key, [data])
                    data = options[0]["id"] if len(options) > 0 else None
                    desc = options[0]["desc"] if len(options) > 0 else ""
                else:
                    data = None
                    desc = ""
                output["{}Desc".format(key)] = desc

            output[key] = data

        return output

# Custom field for the custom FiscalQuarterType column.
class DateIntervalField(DateIntervalField):
    def __init__(self, label='', validators=None, transform_data=False, **kwargs):
        super(DateIntervalField, self).__init__(label, validators, **kwargs)
        self.transform_data = transform_data

    def process_formdata(self, valuelist):
        if self.transform_data:
            data = str(valuelist[0])
            # transform your data here. (for example: data = data.replace('-', '.'))

        super(DateIntervalField, self).process_formdata([data])

# Classes to provide choices for select field choices

class GeneratedChoices:

    def serialize_options(self):
        return self.choices

class Fiscalyears(GeneratedChoices):
    choices = [(y, u"FY{}".format(y))
               for y in range(YEAR_RANGE_MIN, YEAR_RANGE_MAX)]
    choices.insert(0, (0, u""))

class Quarters(GeneratedChoices):
    choices = FISCAL_QUARTERS

class Years(GeneratedChoices):
    choices = [(y, str(y))
               for y in range(YEAR_RANGE_MIN, YEAR_RANGE_MAX)]
    choices.insert(0, (0, u""))

class Months(GeneratedChoices):
    choices = [(item[0], item[1]) for item in enumerate(calendar.month_abbr)]


# Primary table forms
def child_choices():
    return alch.Childlist().query.order_by("childID")
def disposition_choices():
    return alch.Dispositionlist().query.order_by("dispositionDesc")
def driver_choices():
    return alch.Driverlist().query
def final_choices():
    return alch.Finallist().query.order_by("finalID")
def fundingsource_choices():
    return alch.Fundingsourcelist().query.order_by("fundingsourceID")
def host_choices():
    return alch.Hostlist().query.order_by("hostDesc")
def maturity_choices():
    return alch.Maturitylist().query.order_by("maturityID")
def sponsor_choices():
    return alch.Sponsorlist().query.order_by("sponsorDesc")
def stakeholder_choices():
    return alch.Stakeholderlist().query.order_by("stakeholderDesc")
def technology_choices():
    return alch.Technologylist().query.order_by("technologyID")
def type_choices():
    return alch.Typelist().query.order_by("typeDesc")

class Description(ModelForm, FormlyAttributes, DataSerializer):
    class Meta:
        model = alch.Description
        include_primary_keys = True
        only = ["name", "abstract", "rationale", "businesscase",
                "dependencies", "proposer", "customer", "created", "ended",
                "descriptionLastModified", "descriptionLastModifiedBy"]

    name = StringField(label=u"name", validators=[Required()],
        description=u"A clear description of the objective/purpose of "
                     "the proposed project, and if known, what it would "
                     "take to complete. The first 100 characters will be "
                     "used in listings, etc.")
    abstract = TextAreaField(u"abstract",
        description=u"A clear description of the objective/purpose of the "
                     "proposed project, and if known, what it would take "
                     "to complete. The first 100 characters will be used "
                     "in listings, etc.")
    rationale = TextAreaField(u"rationale",
        description=u"Why is the proposed work important? Tie it to "
                    "STScI, mission and division strategies, where "
                    "possible. Does it save costs, avoid risks, etc? If "
                    "so, also indicate this in the relevant metadata.")
    businesscase = TextAreaField(u"business case",
        description=u"A business case compares the costs (labor, non-"
                     "labor, opportunity) of doing the work with the "
                     "potential benefits, and the risk of not doing, the "
                     "work to show a return on investments. For projects "
                     "that require significant investments, the funding "
                     "source(s) and type(s) must also be identified.")
    dependencies = TextAreaField(u"dependencies",
        description=u"Describe any dependencies between this and other "
                     "projects: must preceed, depends on, must be "
                     "coordinated with, competes for unique resources "
                     "with, ...")
    maturity = QuerySelectField(u"maturity",
        query_factory=maturity_choices,
        description=u"Maturity shows where an idea is on the path to "
                      "full-fledged, planning-ready project.")
    proposer = StringField(u"proposer",
        description = "Name of the organization and/or person that proposed the "
               "original idea.")
    customer = StringField(u"customer",
        description=u"Name of the person who says when the project is done.")
    sponsor = QuerySelectField(u"sponsor",
        query_factory=sponsor_choices,
        description=u"Name of the sponsoring organization for the project, "
                     "which is the one that pays for doing the work.  "
                     "Together with Funding Source, this uniquely identifies "
                     "how we will pay for doing the work or making the "
                     "required capital investments.")
    fundingsource = QuerySelectField(u"funding source",
        query_factory=fundingsource_choices,
        description=u"Identify the funding source for this project. Here, "
                     "'Other' will be used for grants and other contracts "
                     "besides HST and JWST. Together with Sponsor this "
                     "uniquely identifies how we will pay for doing the work "
                     "or making the required capital investments.")
    host = QuerySelectField(u"host",
        query_factory=host_choices,
        description=u"Name of the host organization for the project, which "
                     "is the one that manages doing the work.")

    stakeholders = QuerySelectMultipleField(u"stakeholders",
         query_factory=stakeholder_choices,
         description=u"Which organizations, besides the sponsor stand to be "
                      "affected (positively or negatively) by this project?")

    technology = QuerySelectField(u"technology",
        query_factory=technology_choices,
        description=u"Identify the primary technology involved with/affected "
                     "by this project.  Use the categorization of the "
                     "Technology Report. Note: The Implementation Plan is "
                     "sorted by technology, and projects with no technology "
                     "will not show up!")
    type = QuerySelectField(u"type",
        query_factory=type_choices,
        description=u"Categorize the project type.")

    drivers = QuerySelectMultipleField(u"drivers",
        query_factory=driver_choices,
        description=u"Identify the primary driver, or rationale, for this "
                     "project.")

    created = DateField(u"created",
        description=u"The date on which the original idea was entered into "
                     "the tool. This is a computed value.")
    ended = DateField(u"ended",
        description=u"The date on which the project was marked as ended. "
                     "This is a computed value.")
    final = QuerySelectField(u"final state",
        query_factory=final_choices,
        description=u"If this project has come to an end, one way or the "
                     "other, what is that final state?")

    childs = QuerySelectMultipleField(u"children",
         query_factory=child_choices,
         description=u"For an absorbed project, enter the project ID of the "
                      "surviving project. For a split project, enter the "
                      "project IDs of the child projects.")

    latest_dispositions = QuerySelectMultipleField(u"disposition",
        query_factory=disposition_choices,
        description=u"What decision was made during the planning cycle with "
                     "respect to this project?")

    # We need a table-specific handle for these two generic columns since
    # otherwise the search will never get to just one column
    descriptionLastModified = DateTimeField(u"last updated", format="%Y-%m-%dT%H:%M:%S.%fZ")
    descriptionLastModifiedBy = StringField(u"last updated by")

    def __init__(self, *args, **kwargs):
        super(Description, self).__init__(*args, **kwargs)
        read_only(self.created)
        read_only(self.ended)
        read_only(self.latest_dispositions)
        read_only(self.descriptionLastModified)
        read_only(self.descriptionLastModifiedBy)

def complexity_choices():
    return alch.Complexitylist().query
def costlevel_choices():
    return alch.Costlevellist().query
def flavor_choices():
    return alch.Flavorlist().query
def initiative_choices():
    return alch.Initiativelist().query.order_by("initiativeDesc")
def risklevel_choices():
    return alch.Risklevellist().query
def scope_choices():
    return alch.Scopelist().query
def strategy_choices():
    return alch.Strategylist().query.order_by("strategyDesc")
def visibility_choices():
    return alch.Visibilitylist().query

class Portfolio(ModelForm, FormlyAttributes, DataSerializer):
    class Meta:
        model = alch.Portfolio
        include_primary_keys = True
        only = ["rpu", "budgetIn",
                "portfolioLastModified", "portfolioLastModifiedBy"]

    
    flavor = QuerySelectField(u"portfolio category",
        query_factory=flavor_choices,
        description=u"Project portfolio management is not all about strategy "
                     "and resources.  Maintaining a balance between the "
                     "projects that have to be done to keep us going, that "
                     "allow us to get better at what we do, and that allow us "
                     "to really change what we do has its own strategic "
                     "value. This attribute categorizes this project in that "
                     "dimension.")

    strategys = QuerySelectMultipleField(u"strategies",
        query_factory=strategy_choices,
        description=u"Which Institute strategic goals does this project "
                     "support, if any?")

    initiative = QuerySelectField(u"initiative",
        query_factory=initiative_choices,
        description=u"Which Office of Technology initiative does this project "
                     "belong in, if any?")
    scope = QuerySelectField(u"scope",
        query_factory=scope_choices,
        description=u"These next five attributes are criteria that, taken "
                     "together, determine the level of attention that this "
                     "project deserves. This may be reflected in the level of "
                     "reporting to stakeholders and management, in the level "
                     "of project management during project execution, etc. We "
                     "don't have enough experience at the moment to say where "
                     "the dividing lines are, so for now you will have to "
                     "make your own best guess. Characterize the scope level "
                     "of this project.")
    complexity = QuerySelectField(u"complexity",
        query_factory=complexity_choices,
        description=u"Characterize the complexity level of this project.")
    visibility = QuerySelectField(u"visibility",
        query_factory=visibility_choices,
        description=u"Characterize the level of visibility of this project. "
                     "Does it reach the project at GSFC, NASA HQ, the "
                     "astronomical community, the public?")
    risklevel = QuerySelectField(u"risk level",
        query_factory=risklevel_choices,
        description=u"Characterize the level of risk associated with not "
                     "doing this project.")
    costlevel = QuerySelectField(u"cost level",
        query_factory=costlevel_choices,
        description=u"Characterize the cost level of this project.")
    rpu = DecimalField(u"effort",
        description=u"Enter the estimated project effort in RPUs. An  RPU "
                     "(Reference Project Unit) corresponds to a level of "
                     "effort of 1000 hours during the 6 month planning "
                     "period, with half of those hours coming from critical "
                     "resources. A higher RPU may be assigned if the project "
                     "has a high management overhead, extraordinary "
                     "reporting requirements, high visibility, or any other "
                     "factor likely to require above average effort in "
                     "ordinary project management  tasks.")
    budgetIn = DateIntervalField(u"budget in",
        description=u"For projects whose budget needs to be planned (e.g., "
                     "ED-05), when will that happen?")
    # We need a table-specific handle for these two generic columns since
    # otherwise the search will never get to just one column
    portfolioLastModified = DateTimeField(u"last updated", format="%Y-%m-%dT%H:%M:%SZ")
    portfolioLastModifiedBy = StringField(u"last updated by")

    def __init__(self, *args, **kwargs):
        super(Portfolio, self).__init__(*args, **kwargs)
        read_only(self.portfolioLastModified)
        read_only(self.portfolioLastModifiedBy)

def progress_choices():
    return alch.Progresslist().query.order_by("progressID")
def proj_visibility_choices():
    return alch.Proj_visibilitylist().query.order_by("proj_visibilityID")

class Project(ModelForm, FormlyAttributes, DataSerializer):
    class Meta:
        model = alch.Project
        include_primary_keys = True
        only = ["proj_manager", "tech_manager", "project_url", "startedOn",
                "finishedOn", "projectLastModified", "projectLastModifiedBy"]

        project_url = StringField(u"project url",
        description=u"The full URL of the project page. The project page is "
                     "where project status is reported, such as on the CPT "
                     "project wiki. Limited to 255 characters.")
    progress = QuerySelectField(u"progress",
        query_factory=progress_choices,
        description=u"Where is this project in the Project Management "
                     "Framework?")

    proj_manager = StringField(u"project manager",
        description=u"Name of the project manager.")
    tech_manager = StringField(u"technical manager",
        description=u"Name of the technical manager.")
    proj_visibility = QuerySelectField(u"project visibility",
        query_factory=proj_visibility_choices,
        description=u"Categorize visibility for running this project. Will "
                     "it be run as an integrated schedule project, a regular "
                     "project, or as some other (lower visibility) type?")
    startedOn = DateField(u"started",
        description=u"The actual date on which the project started running, "
                     "i.e., the first day of the definition phase.")
    finishedOn = DateField(u"finished",
        description=u"The date on which the project was successfully ended, "
                     "i.e., the last day of the closeout phase of the "
                     "project.  Format as above.")

    # We need a table-specific handle for these two generic columns since
    # otherwise the search will never get to just one column
    projectLastModified = DateTimeField(u"last updated", format="%Y-%m-%dT%H:%M:%SZ")
    projectLastModifiedBy = StringField(u"last updated by")

    def __init__(self, *args, **kwargs):
        super(Project, self).__init__(*args, **kwargs)
        read_only(self.projectLastModified)
        read_only(self.projectLastModifiedBy)


def fiscal_years():
    return alch.Fiscalyears().query
def quarters():
    return alch.Quarters().query
def years():
    return alch.Calendaryears().query
def months():
    return alch.Months().query

class Disposition(ModelForm, FormlyAttributes, DataSerializer):
    class Meta:
        model = alch.Disposition
        include_primary_keys = True
        only = ["explanation", "disposedIn", "reconsiderIn", "plannedFor",
                "dispositionLastModified", "dispositionLastModifiedBy"]

    disposedIn = DateIntervalField(u"disposed", validators=[Required()],
        transform_data=True,
        description=u"In which planning cycle was this disposition made? "
                     "Changing this date and pressing save will create a new "
                     "disposition record.  If you don't change the date, then "
                     "you will update the record you are looking at.")
    disposition = QuerySelectField(u"disposition", validators=[Required()],
        query_factory=disposition_choices,
        description=u"What decision was made during the planning cycle with "
                     "respect to this project?")
    explanation = TextAreaField(u"explanation",
        description=u"State the reasons behind the disposition decision.")
    reconsiderIn = DateIntervalField(u"reconsider",
        description=u"For a deferred project, when will it be considered "
                     "again?")
    plannedFor = DateIntervalField(u"start",
        description=u"Estimated dates for the  start and finish of work on the "
                     "project.")
    # We need a table-specific handle for these two generic columns since
    # otherwise the search will never get to just one column
    dispositionLastModified = DateTimeField(label=u"last updated", format="%Y-%m-%dT%H:%M:%SZ")
    dispositionLastModifiedBy = StringField(label=u"last updated by")

    def __init__(self, *args, **kwargs):
        super(Disposition, self).__init__(*args, **kwargs)
        read_only(self.dispositionLastModified)
        read_only(self.dispositionLastModifiedBy)

class Latest_disposition(Disposition):
    class Meta:
        model = alch.Latest_disposition
        include_primary_keys = True
        only = ["explanation", "disposedIn", "reconsiderIn", "plannedFor",
                "latestDispositionLastModified", 
                "latestDispositionLastModifiedBy"]

    # We need a table-specific handle for these two generic columns since
    # otherwise the search will never get to just one column
    latestDispositionLastModified = DateTimeField(label=u"last updated", format="%Y-%m-%dT%H:%M:%SZ")
    latestDispositionLastModifiedBy = StringField(label=u"last updated by")

    def __init__(self, *args, **kwargs):
        super(Latest_disposition, self).__init__(*args, **kwargs)
        read_only(self.latestDispositionLastModified)
        read_only(self.latestDispositionLastModifiedBy)

class Comment(ModelForm, FormlyAttributes, DataSerializer):
    class Meta:
        model = alch.Comment
        include_primary_keys = True
        only = ["commentID", "comment", "commentAuthor", "commentAuthored",
                "commentLastModifiedBy", "commentLastModified"]

    comment = TextAreaField(u"comment", validators=[Required()],
        description=u"Comment text goes here.")
    commentAuthor = StringField(u"created by",
        description=u"User ID of original author. This is a computed value.")
    commentAuthored = DateTimeField(u"on", format="%Y-%m-%dT%H:%M:%SZ",
        description=u"Date that comment was written. This is a computed "
                     "value.")
    commentLastModifiedBy = StringField(u"last edited by",
        description=u"Most recent editor. This is a computed attribute.")
    commentLastModified = DateTimeField(u"on", format="%Y-%m-%dT%H:%M:%S.%fZ",
        description=u"Time of last edit. This is a computed value.")

    def __init__(self, *args, **kwargs):
        super(Comment, self).__init__(*args, **kwargs)
        read_only(self.commentID)
        read_only(self.commentAuthor)
        read_only(self.commentAuthored)
        read_only(self.commentLastModified)
        read_only(self.commentLastModifiedBy)


