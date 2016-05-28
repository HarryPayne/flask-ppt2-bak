from datetime import datetime
import re
from sqlalchemy import Date, desc, String, Text
from sqlalchemy.inspection import inspect
from sqlalchemy.sql.expression import or_
import sys

from flask import (abort, flash, g, json, jsonify, redirect,
                   render_template, request, url_for)
from flask_jwt import current_identity, jwt_required
from flask_cors import cross_origin
from werkzeug.datastructures import ImmutableMultiDict
from werkzeug.urls import url_decode, url_unquote

from flask_ppt2 import app, db, lm, jwt, wtforms_json
# from app import csrf
from flask_ppt2 import forms
import flask_ppt2.alchemy_models as alch

# from copy import deepcopy
# from flask_jwt import jwt_required, current_user
# from migrate.versioning.schemadiff import ColDiff
# from sqlalchemy.util import symbol
# from flask_ppt2.alchemy_models import DBmetadata

# Don't mess with the user table, defined in the auth module.
TABLE_MODELS = [getattr(alch, t.name.capitalize())
                    for t in alch.DBmetadata.sorted_tables
                    if t.name not in ["fiscalyears", 'user']]

# Flask page template handlers

@app.errorhandler(404)
def not_found_error(error):
    return render_template('404.html'), 404

@app.errorhandler(500)
def internal_error(error):
    db.session.rollback()
    return render_template('500.html'), 500


@app.route('/', methods=['GET', 'POST'])
@app.route('/index', methods=['GET', 'POST'])
def index():
    """Render and return the only page sent from the back end."""
    return render_template('index.html',
                           title='Home',
                           minified=app.config["MINIFIED"])

# We use angular-formly to configure forms on the front end dynamically. We
# do that by sending lists of field definitions in JSON. The lists are built
# by inspecting the SQLAlchemy table models and the wtforms model forms.
#
# On the front end, each form has a controller with a "model" attribute that
# holds the data for the fields, and a "fields" attribute that holds a list
# of formly attribute objects.

@app.route("/getFormlyFields", methods=['POST'])
def get_formly_fields():
    """Return a dictionary of angular-formly form definitions.

    Returns a dictionary
        keys:   names of the 5 data tables
        values: list of formly attributes for the key table. Forms are built
    """
    attributes = dict()
    attributes["description"] = forms.Description().formly_attributes()
    attributes["portfolio"] = forms.Portfolio().formly_attributes()
    attributes["disposition"] = forms.Disposition().formly_attributes()
    attributes["project"] = forms.Project().formly_attributes()
    attributes["comment"] = forms.Comment().formly_attributes()

    return jsonify(**attributes)

@app.route("/getBriefDescriptions", methods=["POST"])
def getBriefDescriptions():
    """ return list of project brief descriptions

    Returns a list of json objects, one per project, with attributes matching
    the list of alch.Description model column names specified in "columns",
    with values taken from the database.
    """
    columns = ["projectID", "name", "abstract", "finalID"]
    d = alch.Description
    p = alch.Description.projectID
    entities = [getattr(d, column) for column in columns]
    results = d.query.with_entities(*entities).order_by(p).all()
    descriptions = [result._asdict() for result in results]
    return jsonify(descriptions=descriptions)

# Under the Select tab there is an option for the user to select one of the
# controlled vocabulary attributes and get a count of projects for each value
# in that vocabulary. These two methods provide the data for rendering the
# drop down to select an attribute and to return the breakdown results,
# respectively.

@app.route("/getBreakdownChoices", methods=['POST'])
def getBreakdownChoices_JSON():
    """Return breakdown results as JSON"""
    # strip out query_factory functions to make field data serializable
    fields = get_all_select_fields()
    for field in fields:
        del field["query_factory"]
    return jsonify(choices=fields)

def get_all_select_fields():
    """Send choices for breakdown by attribute dropdown as list of dicts."""
    fields = []
    fields += get_select_field_labels_from(forms.Description())
    fields += get_select_field_labels_from(forms.Portfolio())
    fields += get_select_field_labels_from(forms.Project())
#     fields += get_select_field_labels_from(forms.Disposition())
#     fields += get_select_field_labels_from(forms.Latest_disposition())

    # put fields in alphabetical order
    fields.sort(key = lambda item: item["desc"])
    return fields

def get_select_field_labels_from(form):
    """Return select field labels from form as list."""
    table_name = form.Meta.model.__table__.name
    return [{"id": item.name, "desc": item.label.text, "table": table_name,
             "query_factory": item.query_factory}
            for item in form if item.type.startswith("QuerySelect")]

@app.route("/getBreakdownByAttribute/<key>", methods=['POST'])
def getBreakdownByAttribute(key):
    """Send annotated list of project counts for each allowed value of key.

    Parameters:
        key    the column name of the attribute

    Returns:
        A JSON object containing:
            the label for that option,
            a list of projectIDs matching that choice,
            a description of the query used to obtain the results,
            a sql string for reproducing the results.
    """
    # Start with a query against the primary table. Save the column model
    # for sorting results at the end.
    p = db.session.query(alch.Description)
    p.sort_on = alch.Description.projectID
    p, col = get_filter_column_for_key(p, key)

    # Build breakdown report rows.
    breakdown_rows = []
    # Insert a null choice, if called for
    if col.add_null_choice:
        breakdown_rows.append(get_breakdown_row(p, col, None))

    for choice in col.choices:
        breakdown_rows.append(get_breakdown_row(p, col, choice))

    return jsonify(breakdown=breakdown_rows)

def get_filter_column_for_key(p, key):
    """ Return object for filtering search results or throw KeyError.

    Parameters:
        p       a sqlalchemy Query object
        key     the name of a table attribute, which may be a column,
                relationship, or association proxy

    Return a table object col with optional additional attributes:
        choices
            the vocabulary objects for relationships and association proxies.
            Determined by looking at the form field for this column, found
            by naming convention.
        model
            an object to be used in a query filter if the key is one-to-many
            or many-to-many with projects. Column objects are their model.
        none_model
            an object to be used in a query filter for one-to-many or
            many-to-many attributes when looking for null values, such as
            projects without drivers.
        label
            the label from the form field.
        add_null_choice
            True for association proxies. Otherwise False. The controlled
            vocabulary choices do not have a null choice, but you might want
            to search for null values.
    """
    col = get_column_for_key(key)

    if col.is_relationship == False:
        # Then col is really a column. Join data_table to query if
        # necessary. Otherwise the filtering will fail.
        form = getattr(forms, col.data_table_name.capitalize())()
        field = getattr(form, key)
        col.label = field.label.text
        p, col = join_data_table(p, col)
        return p, col

    elif col.is_relationship and not col.is_association_proxy:
        # The column in the model that is needed at query time is the backref
        # from a relationship in the association object. I can't figure out
        # how to find the thing, so we fall back on a naming convention.
        data_table = getattr(alch, col.data_table_name.capitalize())
        col.model = getattr(data_table, key)

        # But for None values need the model column that matches the key
        none_model_name =  "{}ID".format(key)
        col.none_model = getattr(data_table, none_model_name)

        # Follow the naming convention to the matching form field to get
        # the choices.
        form = getattr(forms, col.data_table_name.capitalize())()
        field = getattr(form, key)
        col.label = field.label.text
        col.choices = field.query_factory().all()
        col.add_null_choice = False
        p, col = join_data_table(p, col)
        return p, col

    elif col.is_relationship and col.is_association_proxy:
        # Col itself is the association proxy object. But for None values
        # still need the model column that matches the key
        data_table = getattr(alch, col.data_table_name.capitalize())
        none_model_name = re.sub("s\\b", "ID", key)
        col.none_model = getattr(data_table, none_model_name)
        col.add_null_choice = True
        p, col = join_data_table(p, col)
        return p, col

    else:
        raise KeyError


def get_column_for_key(key):
    """Return column, relationship, or proxy obj with data for key or error.

    Find the table and column or relationship that holds the data for the
    key by examining the models in the alchemy_models module. If that fails
    look at the forms for a select field that might indicate an association
    proxy named key.

    Parameters:
        key    a string with the name of the object being sought

    Returns:
        col
            a sqlalchemy column or relationship object with these
            attributes:

        data_table_name
            The name of the table the column lives in
        root
            The key for getting values out of choice objects. For a
            relationship "foo", root = "foo". Choices come from the
            "foolist" table and have attributes "fooID" and "fooDesc",
            which are constructed from root. Association proxy "foos" also
            has root = "foo".
        filter
            The name of the filter for values on this column. For columns and
            relationships "foo", filter="foo". But for association proxy
            "foos", which returns a collection of objects, filter="foos".
            Key does not work here as association proxies have funny keys.
        is_relationship
            True for relationships and association proxies. Otherwise False.
        is_association_proxy
            True for association proxies. Otherwise False.
    """

    # Check for one-to-many relationships that have an association object and
    # table. The test for this less used path has to come first. Otherwise
    # the algorithm finds the association table, not the base table. Relations
    # going back to the Description table don't count.
    matched_by_rel = [t for t in TABLE_MODELS
                        for k in inspect(t).relationships.keys()
                          if re.match(key, k)]
    if matched_by_rel:
        # From the relationship we identify the table that holds the data.
        # We can get the column from the model of that table
        if len(matched_by_rel) == 1:
            data_table = matched_by_rel[0]
        else:
            # Get down to one or throw an error.
            data_table = get_down_to_one(matched_by_rel, key)

        # We return the relationship as if it were a column.
        mapper = inspect(data_table)
        col = mapper.relationships[key]
        col.data_table_name = data_table.__tablename__
        col.root = key
        col.filter = key
        col.is_relationship = True
        col.is_association_proxy = False

        return col

    matched_by_col = [t for t in TABLE_MODELS
                      if [k for k in inspect(t).columns.keys()
                          if re.match(key, k)]]
    if matched_by_col:
        if len(matched_by_col) == 1:
            data_table = matched_by_col[0]
        else:
            # Get down to one or throw an error.
            data_table = get_down_to_one(matched_by_col, key)
        col = inspect(data_table).columns[key]
        col.data_table_name = data_table.__tablename__
        col.root = key
        col.filter = key
        col.is_relationship = False
        col.is_association_proxy = False
        return col

    else:
        # Call this function which returns a list of all the select fields
        # in all of the forms and which table they are in.
        select_fields = get_all_select_fields()
        select_field = [c for c in select_fields if c["id"] == key]
        if len(select_field):
            try:
                field = select_field[0]
                data_table_name = field["table"]
                data_table = getattr(alch, data_table_name.capitalize())
                col = getattr(data_table, key)
                col.data_table_name = data_table_name
                col.filter = key
                col.is_relationship = True
                col.is_association_proxy = True
                col.choices = field["query_factory"]().all()
                attrs = inspect(col.choices[0]).dict.keys()
                key_attr = [a for a in attrs if a.endswith("ID")][0]
                col.root = re.sub("ID\\b", "", key_attr)
                col.label = field["desc"]
                return col
            except:
                pass

    # Raise an error if no match was found.
    raise AttributeError

def get_down_to_one(tables, key):
    """Return one instance of a column in multiple tables or AttributeError."""
    try:
        # If only one is a foreign key then go with that.
        matched_with_fk = [t for t in tables
                           if inspect(t).columns[key].foreign_keys]
        if len(matched_with_fk) == 1:
            return matched_with_fk[0]
    except:
        pass

    # If list includes Disposition and Latest_disposition, take
    # the second.
    matched_with_latest = [t for t in tables
                           if inspect(t).tables[0].name
                            == "latest_disposition"]
    if len(matched_with_latest) == 1:
        return matched_with_latest[0]
    
    # If one of the list tables was matched because of a relationship back
    # to one of the main tables, ignore it.
    not_matched_with_list_table = [t for t in tables
                                   if not inspect(t).tables[0].name.endswith("list")]
    if len(not_matched_with_list_table) == 1:
        return not_matched_with_list_table[0]
    
    # If the description table is in the list because of a relationship back
    # to it from one of the other non-list tables, ignore it.
    not_rel_to_description_table = [t for t in tables
                                    if not inspect(t).tables[0].name != 'description']
    if len(not_rel_to_description_table) == 1:
        return not_rel_to_description_table[0]
    
    raise AttributeError

def join_data_table(p, col):
    """Join the data_table for col to the query p if not there already.

    Return updated query p and column col.
    """
    model = getattr(alch, col.data_table_name.capitalize())
    mapper = inspect(model)
    if (col.data_table_name != "description"
      and mapper not in p._join_entities):
        # We rely on a naming convention to capitalize the table name to get
        # the model name.
        p = p.outerjoin(model)
    return p, col

def get_breakdown_row(p, col, choice):
    """Return a breakdown by attribute row for a given choice.

    Arguments:
        p        sqlalchemy Query object
        col      sqlalchemy table Column object
        choice   sqlalchemy list table row object

    Returns a dictionary with keys:
        desc
            the description from the given choice or "none" if the
            description is empty.
        projectList
            a list of project ids of the projects having the value of the
            given choice sorted by project id.
        query_desc
            a human readable description of the query giving these results.
        query_string
            a query_string description of the query giving these results.
    """
    if choice is None:
        val = None
        desc = "no {}".format(col.label)
        query_desc = "no {}".format(col.label)
        query_string = "{}=".format(col.filter)
    else:
        val = getattr(choice, "{}ID".format(col.root))
        desc = getattr(choice, "{}Desc".format(col.root))
        if desc == "":
            desc = "none"
        query_desc = "{}={}".format(col.label,
                                "'{}'".format(desc) if " " in desc
                                else desc)
        query_string = "{}={}".format(col.filter, val)

    if col.is_relationship and choice == None:
        r = p.filter(col.none_model == None)
    elif col.is_relationship and not col.is_association_proxy:
        r = p.filter(col.model==choice)
    elif col.is_relationship and col.is_association_proxy:
        r = p.filter(col.contains(choice))
    else:
        r = p.filter(col == val)

    item = {"desc": desc,
            "projectList": [proj.projectID for proj
                            in r.order_by(p.sort_on).all()],
            "query_desc": query_desc,
            "query_string": query_string
            }

    return item

def truncate_gracefully(text_string, max_length):
    """Truncate text_string if too long.

    Truncate a string at the last space character within the first max_length
    characters, if the string is longer than max_length. If so, add ellipsis.
    """
    added_ellipsis = ""
    if len(text_string) > max_length:
        added_ellipsis = "..."
        return text_string[0:text_string[0:max_length].rfind(" ")] \
            + added_ellipsis
    else:
        return text_string

# @app.route("/getReportTableJSON", methods=["POST"])
# def getReportTableJSON():
#     """Generate JSON for the DataTables data on the Report tab.
# 
#     POST parameters:
#         projectID       a list of projectIDs of projects to be displayed
#         tableColumns    a list of table columns. Only data for these columns
#                         are returned (in order, not that it matters).
#     """
#     projectIDList = request.json.get("projectID", [])
#     tableColumns = request.json.get("tableColumns", [])
# 
#     # Find out everything about the specified table columns
#     allAttrsFromDB = getAllAttributes()
#     columns = []
#     for col_name in tableColumns:
#         if col_name in allAttrsFromDB.keys():
#             columns.append(allAttrsFromDB[col_name])
# 
#     # Query for all projects in specified list
#     filter = alch.Description.projectID.in_(projectIDList)
#     p = alch.Description.query.filter(filter).all()
# 
#     response = get_report_rows_from_query(p, columns)
#     return jsonify(**response)

@app.route("/getReportResults", methods=["POST"])
def getReportResults():
    """Get report data matching query_string from request.json."""
    default_columns = ["name", "abstract", "maturity", "drivers", 
                       "latest_dispositions", "flavor"]
    if request.method == "POST":
        query_string = request.json.get("query_string", "")
        tableColumns = request.json.get("tableColumns", default_columns)
    else:
        query_string = request.query_string
        tableColumns = default_columns
    p = db.session.query(alch.Description)
    p.sort_model = alch.Description.projectID

    # Generate a list of column entities for columns specified in the request.
    # Skip over bogus column names.
    entities = []
    query_descs = []
    query_strings = []
    for key in tableColumns:
        if key in ("projectID"):
            continue
        try:
            p, col = get_filter_column_for_key(p, key)
        except AttributeError:
            continue
        else:
            entities.append(col)

    if query_string != "":
        # Apply the filters specified in the query_string
        query = url_decode(url_unquote(query_string))

        for key in query.keys():
            # Pass special keys.
            if key in ("name_abs"):
                # Bundle name and abstract columns and key for use below.
                p, name = get_filter_column_for_key(p, "name")
                p, abstract = get_filter_column_for_key(p, "abstract")
                col = {
                    "name": name,
                    "abstract": abstract,
                    "key": key
                }
            else:
                # Look for the attributes that match the keys in the query, making
                # allowance for hybrid property columns, which are the date range
                # select values.
                try:
                    p, col = get_filter_column_for_key(p, key)
                except:
                    # Skip over bogus keys.
                    continue

            if hasattr(col, "choices"):
                # Filter on matches to controlled vocabulary choices.
                # Key is an association proxy name. To get to the data column
                # name, we use the naming convention.
                if col.is_association_proxy:
                    data_col = "{}ID".format(re.sub("s\\b", "", key))
                else:
                    data_col = "{}ID".format(key)

                # Get unique list of null and integer values in query.
                raw_values = list(set(query[key]))
                null_values = False
                if "" in raw_values:
                    null_values = True
                    raw_values.remove("")

                # Match accepted choices to request values.
                int_values = [int(i) for i in raw_values]
                accepted_choices = [choice for choice in col.choices
                                    if getattr(choice,
                                               "{}ID".format(col.root))
                                    in int_values]

                # Build filter query_desc and query_string strings from
                # accepted choices.
                desc_name = "{}Desc".format(col.root)
                accepted_descs = ["'{}'".format(getattr(item, desc_name))
                                  if getattr(item, desc_name) else "none"
                                  for item in accepted_choices]
                accepted_values = [getattr(item, "{}ID".format(col.root))
                                   for item in accepted_choices]
                q_strings = []
                if len(accepted_values) > 1:
                    accepted_values.sort()
                    for val in accepted_values:
                        q_strings.append("{}={}".format(col.filter, val))
                elif len(accepted_values) == 1:
                    q_strings.append("{}={}".format(col.filter, 
                                                    accepted_values[0]))
                elif len(accepted_values) == 0:
                    # Then there is nothing to do here.
                    continue

                if null_values:
                    q_strings.append("{}=".format(col.filter))

                q_descs = []
                if col.is_association_proxy:
                    accepted_descs.sort()
                    q_descs.append("{} include {}".format(
                                             col.label,
                                             " or ".join(accepted_descs)))
                else:
                    q_descs.append("{}={}".format(col.label,
                                                  accepted_descs[0]))
                if null_values:
                    q_descs.append("no {}".format(col.label))

                query_desc = " or ".join(q_descs)
                if query_desc:
                    query_descs.append(query_desc)
                query_string = "&".join(q_strings)
                if query_string:
                    query_strings.append(query_string)

                # Build the actual query filters based on the accepted choices
                # and apply them.
                key_filters = []
                if len(accepted_values):
                    if col.is_relationship and not col.is_association_proxy:
                        key_filters += [col.model==c  
                                        for c in accepted_choices]
                    elif col.is_relationship and col.is_association_proxy:
                        key_filters += [col.contains(c) 
                                        for c in accepted_choices]
                    else:
                        key_filters.append(col.in_(accepted_values))
                if null_values:
                    if col.is_relationship:
                        key_filters.append(col.none_model == None)
                    else:
                        key_filters.append(col == None)
                if key_filters:
                    p = p.filter(or_(*key_filters))

            elif key == "name_abs":
                # Special handling for name search. Return the union of 
                # results from both "name" and "description" attributes, to 
                # match the behavior of the home page search.
                searchString = query[key][0]
                if searchString == "":
                    continue

                logic = query["name_absLogic"][0]
                if logic == "phrase":
                    query_descs.append("name or abstract contains '{}'".\
                                       format(searchString))
                    query_strings.append("name_abs={}".format(searchString))
                    p = p.filter(or_(col["name"].ilike(
                                            "%{}%".format(searchString)),
                                        col["abstract"].ilike(
                                            "%{}%".format(searchString))))
                elif logic == "and":
                    words = searchString.split(" ")
                    desc_list = []
                    for word in words:
                        if not word:
                            continue
                        desc_list.append("'{}'".format(word))
                        query_strings.append("name_abs={}".format(word))
                        p = p.filter(or_(col["name"].ilike(
                                                "%{}%".format(word)),
                                            col["abstract"].ilike(
                                                "%{}%".format(word))))

                    query_descs.append("name or abstract contains {}".\
                                       format(" and ".join(desc_list)))

                elif logic == "or":
                    # Create a partial for each word, form the union of them,
                    # and join that to the query so far.
                    words = searchString.split(" ")
                    desc_list = []
                    partials = []
                    for word in words:
                        if not word:
                            continue
                        desc_list.append("'{}'".format(word))
                        query_strings.append("name_abs={}".format(word))
                        partials.append(
                            p.filter(or_(
                                col["name"].ilike("%{}%".format(word)),
                                col["abstract"].ilike("%{}%".format(word)))))

                    query_descs.append("name or abstract contains {}".\
                                       format(" or ".join(desc_list)))
                    if partials:
                        p0 = partials[0]
                        for partial in partials[1:]:
                            p0 = p0.union(partial)
                        p = p.join(p0.subquery())

            elif isinstance(col.type, (String, Text)):
                search_string = query[key][0]
                if search_string == "":
                    # Don't bother with empty search strings.
                    continue

                logic = query[col.key + "Logic"]
                logic = logic[0] if logic else "or"
                if logic == "phrase":
                    template = "{} contains '{}'"
                    query_descs.append(template.format(col.label, 
                                                       search_string))
                    query_strings.append("{}={}".format(col.filter, 
                                                        search_string))
                    p = p.filter(col.ilike("%{}%".format(search_string)))
                elif logic == "and":
                    words = search_string.split(" ")
                    desc_list = []

                    for word in words:
                        if not word:
                            continue
                        desc_list.append("'{}'".format(word))
                        query_strings.append("{}={}".format(col.key, word))
                        p = p.filter(col.ilike("%{}%".format(word)))

                    template = "{} contains '{}'"
                    joined = " and ".join(desc_list)
                    query_descs.append(template.format(col.key, joined))
                elif logic == "or":
                    words = search_string.split(" ")
                    desc_list = []
                    partials = []

                    # Create a partial for each word.
                    for word in words:
                        if not word:
                            continue
                        desc_list.append("'{}'".format(word))
                        query_strings.append("{}={}".format(col.key, word))
                        partials.append(
                            p.filter(col.ilike("%{}%".format(word))))

                    template = "{} contains '{}'"
                    joined = " or ".join(desc_list)
                    query_descs.append(template.format(col.key, joined))
                    if partials:
                        # Form the union of the partials and join with the 
                        # query so far.
                        p0 = partials[0]
                        for partial in partials[1:]:
                            p0 = p0.union(partial)
                        p = p.join(p0.subquery())

        p = p.order_by(p.sort_model)

    response = get_report_rows_from_query(p, entities)
    response["projectList"] = [item.projectID for item in p]
    response["query_desc"] = ", and ".join(query_descs) if len(query_descs) else "none"
    response["query_string"] = "&".join(query_strings)

    return jsonify(response=response)

def get_report_rows_from_query(p, columns):
    """ Given query result object and columns list, produce rows

    Send back
        data            a list of rows of database query results, with just
                        projectID and the specified columns.
        columns         send back the column names and labels
        options         default datatables options
    """
    rows = []
    response = {}
    for item in p:
        row = {"projectID": getattr(item, "projectID")}
        for col in columns:

            result_model = get_result_model_from_item(col, item)
            
            if not col.is_relationship:
                value = getattr(result_model, col.key)
                key = col.key

            if col.is_relationship and not col.is_association_proxy:
                # Use naming convention to find the multiple select column.
                # This test comes first because this entity object does not
                # have a type attribute.
                if result_model:
                    rel_object = getattr(result_model, col.root, "")
                    value = getattr(rel_object, "{}Desc".format(col.root))
                else:
                    value = [getattr(c, "{}Desc".format(col.root)) 
                             for c in col.choices 
                             if getattr(c, "{}ID".format(col.root)) == 0][0]
                key = col.root

            elif col.is_relationship and col.is_association_proxy:
                
                rel_objects = getattr(result_model, col.filter)
                values = [getattr(r, "{}Desc".format(col.root))
                          for r in rel_objects]
                value = ", ".join(values)
                key = col.filter

            elif isinstance(col.type, Text):
                value = truncate_gracefully(value, 100)

            elif isinstance(col.type, Date):
                value = value.strftime("%m/%d/%Y") if value else None

            elif hasattr(col, "choices") and not col.is_relationship:
                choice = [c for c in col.choices
                          if getattr(c, col.key) == value]
                if choice:
                    value = getattr(choice[0], re.sub("ID", "Desc", col.key))
                else:
                    value = None

            row[key] = value
        rows.append(row)

    response = {"data": rows}

    # DataTable column definitions for specified columns.
    response["columns"] = get_datatable_columns(columns)

    # Datatables options.
    response["options"] = get_datatable_options(rows)

    return response

def get_result_model_from_item(col, item):
    """Unpack backrefs to the Description model."""
    if col.data_table_name == "description":
        return item
    elif col.data_table_name in ("portfolio", "project"):
        return getattr(item, col.data_table_name)[0]
    elif col.data_table_name in ("latest_disposition"):
        latest_disposition = getattr(item, "disposition_latest", None)[0]
        if latest_disposition:
            # latest disposition is a Disposition table object
            disposition = latest_disposition.disposition
            return getattr(item, table[0])
        else:
            return None
    else:
        return None

def get_datatable_columns(columns):
    """DataTable column definitions for specified columns."""
    # The projectID column requires a render function, which can't be
    # serialized. That needs to be added in the client.
    aoColumns = []
    for col in columns:
        label = col.label if hasattr(col, "label") else col.filter
        dt_col = {"data": col.filter,
                  "title": label.capitalize()}
        aoColumns.append(dt_col)
    return aoColumns

def get_datatable_options(rows):
    """Return a dictionary of jQuery datatable options."""
    # Datatables options
    #    Hide pagination if there is only one page of results
    #    Don't show the option to change the number of results
    #    Don't show the search box
    #    Action is client-side, not server side
    #    No searching
    pageLength = 25
    return {
        "destroy": True,
        "lengthChange": False,
        "pageLength": pageLength,
        "paging": len(rows) > pageLength,
        "pagingType": "full_numbers",
        "saveState": True,
        "searching": False,
        "serverSide": False
    }

# Methods for generating the JSON response to a request for all of the data for
# a given project. We generate forms on the backend, extract the data into a
# dictionary of dictionaries and lists of dictionaries, and send them out.

# The response consists of:
#
#    projectID      projectID is the primary key for all of the major database
#                    and is the unique identifier for each project.
#    csrf_token     a cross-site request forgery token that must be returned
#                    and validated with a request to update the database.
#    formData       a dictionary containing the projectID (again), and a
#                    data object for each of the five data tables. Each
#                    table object contains:
#
#                        tableName      the name of the database table
#                        attributes     a list of attribute value objects
#
#                   Attribute value objects contain:
#
#                        name           attribute name
#                        printValue     an optional string used to display the
#                                        attribute value
#                        value          the attribute value, which may be:
#                                         a single string or number,
#                                         a dictionary with keys "id" and "desc", or
#                                         a list of {id, desc} objects.

# The idea is that the client will merge the project data generated here with
# the list of attributes sent out once at the beginning of the session.

@app.route("/getProjectAttributes/<projectID>", methods=['POST'])
def getProjectAttributesJSON(projectID):
    """Send attribute values for project as JSON."""
    attributes = getProjectAttributes(projectID)

    return jsonify(**attributes)

def getProjectAttributes(projectID, table_name=None):
    """Return database data as JSON."""
    # Get data from database.
    p = alch.Description.query.filter_by(projectID=projectID).first()
    if not p:
        # send back forms with no data (for creating a new project)
        p = alch.Description()
        p.portfolio = [alch.Portfolio()]
        p.project = [alch.Project()]
        p.comments = []
        p.dispositions = []

    descriptionForm = forms.Description(ImmutableMultiDict({}), p)
    csrf_token = descriptionForm["csrf_token"].current_token

    form_data = {}
    # If a table_name is supplied, only send attributes in that table.
    if table_name in ("description", None):
        form_data.update(descriptionForm.serialize_data())

    if table_name in ("portfolio", None):
        portfolio_form = forms.Portfolio(ImmutableMultiDict({}), 
                                         p.portfolio[0])
        form_data.update(portfolio_form.serialize_data())

    if table_name in ("project", None):
        project_form = forms.Project(ImmutableMultiDict({}), p.project[0])
        form_data.update(project_form.serialize_data())

    if table_name in ("disposition", None):
        form_data["dispositions"] = [
            forms.Disposition(ImmutableMultiDict({}), d).serialize_data()
            for d in p.dispositions]

    if table_name in ("comment", None):
        form_data["comments"] = [
            forms.Comment(ImmutableMultiDict({}), c).serialize_data()
            for c in p.comments]
        
    return {"projectID": projectID,
            "csrf_token": csrf_token,
            "formData": form_data}

# Update database from request. The request will have data for only a single
# table, and only updated data from that table are returned (?).
#
# Allow cross origin sources (to make AJAX work), check the jwt and the user
# roles before doing anything. CSRF token checking happens at form validation
# time.

def updateFromForm(model, result, lastModified, lastModifiedBy):
    """Utility for updating db model from json and query result."""
    errors = []
    form = model.from_json(request.json)
    lastModifiedKey = [field.name for field in form 
                       if field.name.endswith("LastModified")
                       or field.name.endswith("lastModified")]
    lastModifiedByKey = [field.name for field in form 
                         if field.name.endswith("LastModifiedBy")
                         or field.name.endswith("lastModifiedBy")]
    if len(lastModifiedKey):
        form[lastModifiedKey[0]].data = lastModified
    if len(lastModifiedByKey):
        form[lastModifiedByKey[0]].data = lastModifiedBy
    if form.validate_on_submit():
        try:
            form.populate_obj(result)
            db.session.add(result)
            db.session.commit()
        except:
            errors.append(sys.exc_info()[0])
    else:
        errors = form.errors
    return form, errors

@app.route("/projectEdit/<projectID>/<tableName>", methods=["POST"])
@cross_origin(headers=['Content-Type', 'Authorization'])
@jwt_required()
def projectEdit(projectID, tableName):
    """ Update specified table for specified project."""
    if 'Curator' not in current_identity.groups:
        # Must be a Curator to edit project.
        abort(401)

    if projectID:
        p = db.session.query(alch.Description).join(alch.Portfolio)
        p = p.filter_by(projectID=projectID).first()
        lastModified = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        lastModifiedBy = current_identity.get_id()

        if tableName == "description":
            form, errors = updateFromForm(forms.Description, p, lastModified, lastModifiedBy)
            if not errors:
                success = "Project description was updated."

        elif tableName == "portfolio":
            form, errors = updateFromForm(forms.Portfolio, p.portfolio[0], lastModified, lastModifiedBy)
            if not errors:
                success = "Project portfolio entry was updated."

        elif tableName == "project":
            form, errors = updateFromForm(forms.Project, p.project[0], lastModified, lastModifiedBy)
            if not errors:
                success = "Project management entry was updated."

        elif tableName == "disposition":
            request.json["projectID"] = int(projectID)
            request.json["lastModifiedBy"] = current_identity.get_id()
            request.json["lastModified"] = p.lastModified
            disposedInFY = request.json["disposedInFY"]
            disposedInQ = request.json["disposedInQ"]
            d = alch.Disposition.query.\
                    filter_by(projectID=projectID).\
                    filter_by(disposedInFY=disposedInFY).\
                    filter_by(disposedInQ=disposedInQ).first()
            if not d:
                d = alch.Disposition(projectID=projectID)
                d_success = "A new disposition was created for cycle "
            else:
                d_success = "Updated disposition for cycle "

            form, errors = updateFromForm(forms.Disposition, d, lastModified, lastModifiedBy)
            if not errors:
                disposedInFY = form["disposedInFY"].data
                FY = [item[1] for item in form["disposedInFY"].choices 
                      if item[0] == disposedInFY][0]
                disposedInQ = form["disposedInQ"].data
                Q = [item[1] for item in form["disposedInQ"].choices 
                     if item[0] == disposedInQ][0]
                cycle = "{FY} {Q}.".format( FY = FY, Q = Q)
                success = d_success + cycle

        elif tableName == "comment":
            commentID = int(request.json["commentID"])
            if commentID:
                c = alch.Comment.query.\
                        filter_by(projectID = projectID).\
                        filter_by(commentID = commentID).first()
                c_success = "The comment was updated."

            else:
                c = alch.Comment(projectID=projectID)
                request.json["commentID"] = None
                request.json["commentAuthor"] = current_identity.get_id()
                request.json["commentAuthored"] = p.lastModified
                request.json["commentEditor"] = None
                request.json["commentEdited"] = None
                c_success = "A new comment was created."

            form, errors = updateFromForm(forms.Comment, c, lastModified, lastModifiedBy)
            if not errors:
                success = c_success

        response = getProjectAttributes(projectID, tableName)
        if errors:
            response["errors"] = errors
        else:
            response["success"] = success

        return jsonify(**response)

# Check the jwt, csrf token, and the user's roles before doing anything.
#
# The data returned are the same as those from getProjectAttributes plus:
#
#    errors    error messages if an error occurred, else nothing
#    success   specific success message if no error occurred, else nothing

@app.route("/projectCreate", methods=["POST"])
@cross_origin(headers=['Content-Type', 'Authorization'])
@jwt_required()
def projectCreate():
    """Create new project."""
    if 'Curator' not in current_identity.groups:
        # Must be a Curator to edit project metadata
        abort(401)

    description_errors = []

    p = alch.Description(created = datetime.today().strftime("%Y-%m-%d"),
                         descriptionLastModifiedBy = current_identity.get_id())

    descriptionForm = forms.Description(request.form, p)

    # *** should be able to create all 3 forms, add them to the session and
    # *** do a commit. let sqlalchemy do its thing.

    if descriptionForm.validate_on_submit():
        try:
            descriptionForm.populate_obj(p)
            db.session.add(p)
            db.session.commit()
            projectID = p.projectID
        except:
            description_errors.append(sys.exc_info()[0])
    else:
        description_errors = descriptionForm.errors

    if description_errors:
        response = getProjectAttributes(p.projectID or 0, "description")
        response["errors"] = description_errors
        return json.dumps(response)

    pt = alch.Portfolio(projectID = p.projectID,
                        portfolioLastModifiedBy = current_identity.get_id())
    portfolioForm = forms.Portfolio(request.form, pt)

    pr = alch.Project(projectID = p.projectID,
                      projectLastModifiedBy = current_identity.get_id())
    projectForm = forms.Project(projectID = p.projectID)

    if (portfolioForm.validate_on_submit() and 
        projectForm.validate_on_submit()):
        try:
            portfolioForm.populate_obj(pt)
            db.session.add(pt)
            projectForm.populate_obj(pr)
            db.session.add(pr)
            db.session.commit()
        except:
            description_errors.append(sys.exc_info()[0])
    else:
        description_errors = portfolioForm.errors + projectForm.errors

    response = getProjectAttributes(projectID, "description")
    if description_errors:
        response["errors"] = description_errors
    else:
        response["success"] = "Created new project"
        response["projectID"] = projectID

    return jsonify(**response)


