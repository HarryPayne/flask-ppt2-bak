(function() {
/*
Project Attribute Manager Service

This service persists the details of a single project, obtained by calls to the
server, and makes them available via the project controller.

Data attributes:

  service.allAttributes: 
    An object keyed on attribute name, which preserves the metadata for each 
    attribute, such as: label, format, help text, and choices for select widgets.
    Downloaded from the server once per session. Because some widgets need two
    attributes, an attribute may have a child attribute. Child attributes also
    have a reference at the top level in allAttributes.

    Attribute values for a single project are loaded on initial visit to the
    project tab. Attributes that have a single instance per object have their
    values stored with the metadata in allAttributes. Attributes that may have
    multiple instances (comments, dispositions, uploaded files) have values that
    are stored in service.rawAttributes. To edit a particular comment, say, all
    of the values for that comment are copied to atributes in allAttributes (and
    by reference to attributes in projectAttributes).
  
  service.projectAttributes:
    A list of references to allAttributes attribute values for each main database
    table. Used to preserve the order in which attributes are displayed on the
    view and edit forms for each main table.
*/
  "use strict";
  
  angular
    .module("app.attributes")
    .factory("attributesService", attributesService);
  
  attributesService.$inject = ["$rootScope", "$http", "$q", "projectListService",
                               "$timeout"];
  
  function attributesService($rootScope, $http, $q, projectListService, 
                             $timeout) {
    var service = {
      addAttrToDataObj: addAttrToDataObj,
      addUniqueAttrToDataObj: addUniqueAttrToDataObj,
      clearAllErrors: clearAllErrors,
      getAttribute: getAttribute,
      getAllAttributes: getAllAttributes,
      getFormData: getFormData,
      getFormlyOptions: getFormlyOptions,
      getFormlyFields: getFormlyFields,
      getKeys: getKeys,
      getProjectAttributes: getProjectAttributes,
      getRawAttributes: getRawAttributes,
      getSelectedChoices:getSelectedChoices,
      getServerError: getServerError,
      getToken: getToken, 
      hasAValue: hasAValue,
      makeProjectLink: makeProjectLink,
      mergeAttributeWithValue: mergeAttributeWithValue,
      newProjectAttributes: newProjectAttributes,
      RestoreState: RestoreState,
      SaveState: SaveState,
      setAllAttributes: setAllAttributes,
      updateProjAttrsFromRawItem: updateProjAttrsFromRawItem,
      updateAllAttributes: updateAllAttributes,
      updateErrors: updateErrors,
      updateFormlyFields: updateFormlyFields,
      updateProjectAttributes: updateProjectAttributes,
      updateProjectAttributesFromForm: updateProjectAttributesFromForm
    };


    service.RestoreState();
    if (typeof service.formlyFields == "undefined") {
      $timeout(function() {
        service.updateFormlyFields();
        service.formlyOptions = {
          view: {formState: {
              horizontalLabelClass: 'col-sm-2',
              horizontalFieldClass: 'col-sm-10',
              readOnly: true
            }
          },
          edit: {
            formState: {
              horizontalLabelClass: 'col-sm-2',
              horizontalFieldClass: 'col-sm-10',
              readOnly: false
            }

          }
        }
      });
    }
    
    $rootScope.$on("savestate", service.SaveState);
    $rootScope.$on("restorestate", service.RestoreState);

    return service;
    
    /**
     * @name addAttrToDataObj
     * @desc Build up a project data object of attribute values, with attribute
     *        name as key. Used to save retrieved values from server for those
     *        tables that are one-to-one with projectID. 
     */
    function addAttrToDataObj(attr) {
      /*
      if (attr.name == "csrf_token" || attr.name == "projectID") {
        return;
      }
      */
      if (attr.format == "multipleSelect" || attr.format == "dateRangeSelect") {
        if(! _.isArray(attr.value)) {
          this[attr.name] = attr.value == null ? "" : attr.value.id;
        }
        else {
          this[attr.name] = _.map(attr.value, function(a) {
            return a.id;
          });
        }
        if (attr.child) {
          if (attr.child.value && !_.isArray(attr.child.value)) {
            this[attr.child.name] = attr.child.value.id;
          }
          else {
            this[attr.child.name] = attr.child.value;
          }
        }
      }
      else if (attr.format == "date") {
        if (attr.computed) return;
        if (attr.value) {
          this[attr.name] = new Date(attr.value).toString("yyyy-MM-dd");
        }
        else {
          this[attr.name] = null;
        }
      }
      else if (_.contains(["commentAuthored", "commentEdited"], attr.name)) { // list of computed attributes rendered as string 
        if (attr.computed) return;
        if (attr.value) {
          this[attr.name] = new Date(attr.value).toString("yyyy-MM-ddTHH:mm:ss");
        }
        else {
          this[attr.name] = null;
        }
      }
      else if (attr.format.substring(0, "child_for_".length) != "child_for_") {
        this[attr.name] = attr.value;
      }      
    }

    function addUniqueAttrToDataObj(attr) {
      if (_.contains(["disposition", "comment"], attr.table)) {
        return;
      }
      addAttrToDataObj(attr);
    }

    /**
     * @name clearAllErrors
     * @desc Delete "errors" attributes from all data attribute objects.
     */
    function clearAllErrors() {
      _.each(service.allAttributes, function(attr) {
        if (attr.hasOwnProperty("errors")) {
          delete attr.errors;
        };
      });
      delete service.server_error;
      return;
    }

    /**
     * @name getAttribute
     * @desc Retrieve a data attribute object by name
     * @param {string} name - name of object to be retrieved
     * @returns {Object} data attribute object
     */
    function getAttribute(name) {
      return service.allAttributes[name];
    }
    
    /** 
     * @name getAllAttributes
     * @desc Retrieve the list of all data attribute objects
     * @returns {Object[]} list of data attribute objects
     */
    function getAllAttributes() {
      return service.allAttributes;
    };
    
    /**
     * @name getFormData
     * @desc Return an object with data from the edit form for the specified
     *        table. This object is suitable for being serialized and sent back
     *        to the server to update the table.
     * @param {string} tableName - the name of the table being edited/inserted
     * @param {Object[]} keys - a list of {name, value} objects used to 
     *        identify the entity of interest in tables that are many-to-one
     *        with projectID.
     * @returns {Object} formData - an object where keys are attribute names
     *        and values are :
     *          {value: {id: number}} if attr.value has an "id" attribute, or
     *          {value: string||number||date||datetime} if it does not.
     */
    function getFormData(tableName, keys) {
      var formData = new Object;
      formData.csrf_token = service.csrf_token;
      if (typeof keys != "undefined") {
        _.each(keys, function(key) {
          if (typeof key.value.id != "undefined") {
            formData[key.name] = key.value.id;
          }
          else {
            formData[key.name] = key.value;
          }
        });
      }
      _.each(service.getProjectAttributes(tableName), addAttrToDataObj, formData);
      if (tableName == "comment") {
        formData["commentEditor"] = $rootScope.currentUser.id;
      }
      return formData;
    };

    /**
     *   @name getFormlyOptions
     *  @desc Return formly options for the current project tab mode
     *  @param {String} mode  "view" for display mode otherwise a project 
     *         subtab name like "description.edit"
     *  @returns {Object} formly formState object
     */
    function getFormlyOptions(mode) {
      if (mode == "view") {
        return service.formlyOptions.view;
      }
      else {
        return service.formlyOptions.edit;
      }
    };
    
    /**
     *  @name getFormlyFields
     *  @desc Return formly fields for the requested data table.
     *  @param {String} tableName - name of the requested table.
     *  @returns {Object[]} - a list of formly field objects
     */
    function getFormlyFields(tableName) {
      return service.formlyFields[tableName];
    }

    /**
     *  @name getKeys
     *  @desc Return the primary key objects used to select the currently 
     *        selected one-to-many table entries (comment or disposition)
     */
    function getKeys() {
      if (typeof service.currentState == "undefined") {
        return;
      }
      if (!"keys" in service.currentState) {
        service.currentState.keys = [];
      }
      return service.currentState.keys;
    }

    /**
     * @name getProjectAttributes
     * @desc Return the list of project data attributes for the given table.
     *        Project data attribute objects have a value and are associated
     *        with a particular project. They hold the project model displayed
     *        in Project tab views
     * @param {string} tableName - the name of the db table of interest
     */
    function getProjectAttributes(tableName) {
      try {
        return service.projectAttributes[tableName];
      }
      catch(e) {
        //alert(e);
      }
    };

    /**
     * @name getRawAttributes
     * @desc Return all project data in one of the one-to-many database tables.
     * @param {string} tableName - name of table of interest ("comment" or
     *        "disposition")
     * @returns {Object[]} - a list of choice objects of form 
     *        {id: number: desc: string}
     */
    function getRawAttributes(tableName) {
      try {
        return service.rawAttributes[tableName];
      }
      catch (e) {
        //
      }
    }
    
    /**
     * @name getSelectedChoices
     * @desc For both single and multiple select fields, compare field
     *        choices (vocabulary) with database values and return selected
     *        choices.
     * @returns {Object[]} - list of select widget choices 
     */
    function getSelectedChoices(merged) {
      if (merged.multi) {
        return _.filter(merged.choices, function(choice){
                 return _.contains(merged.value, choice.id);
               });
      }
      else if (merged.format == "lines") {
        return _.filter(merged.choices, function(choice){
                 return _.contains(merged.value, choice);
               });
      }
      else {
        return _.where(merged.choices, {id: merged.value})[0];
      }
    };

    /**
     * @name getServerError
     * @desc Return the server error from the most recent http request to the
     *        back end. These are for requests that fail, not those that were
     *        successful but reported form validation or database errors.
     * @returns {string}
     */
    function getServerError() {
      return service.server_error;
    }
    
    /**
     * @name getValueFromKey
     * @desc Return the value from keys with a variety of structures.
     */
    function getValueFromKey(key) {
      var value;
      if ("id" in key) {
        value = key.id;
      }
      else if ("value" in key) {
        if (typeof key.value == "number") {
          value = key.value;
        }
        else if (typeof key.value == "string") {
          value = parseInt(key.value);
        }
        else if ("id" in key.value) {
          value = key.value.id;
        }
      }
      return value;
    }
    
    /**
     * @name hasAValue
     * @desc Decide whether a given project attribute has a value, so that the
     *        project view screen can show only attributes that have a value.
     * @returns {Boolean}
     */
    function hasAValue(attr) {
      if ((typeof attr.value != "undefined" && attr.value != null && attr.value != "" && attr.value != []) ||
          (typeof attr.value != "undefined" && attr.value != null && typeof attr.value.id != "undefined" && attr.value.id != null  && attr.value != "" && attr.value != [])) {
        return true;
      }
      else return false;
    }

    function getToken() {
      return service.csrf_token;
    }
    
    function makeProjectLink(projectID) {
      return "project link here";
    };

    /**
     *  Take the project attribute that comes back from the server, which 
     *  consists of only a name and a value, and merge the value with the
     *  attribute in allAttributes, which already has all of the metadata
     *  associated with this field: format, required, computed, ... Take
     *  the merged attribute and push a reference to it onto the
     *  projectAttributes list, which is what the view will iterate over
     *  when rendering the data.
     */
    function mergeAttributeWithValue(attr) {
      if (attr.name == "$$hashKey") {
        return;
      }
      var merged = service.allAttributes[attr.name];
      if (typeof merged == "undefined") {
          return;
      }
      if (merged.format == "multipleSelect" && !merged.multi && attr.value == null) {
        merged.value = merged.choices[0];
      }
      else {
         merged.value = attr.value;
      }
      if (attr.printValue) merged.printValue = attr.printValue;
      if (merged.format.substring(0, "child_for_".length) == "child_for_") {
        return;
      }
      else if (merged.format == "date" && attr.value) {
        merged.value = new Date(Date.parse(attr.value));
      }
      service.projectAttributes[this].push(merged);
    }
    
    /**
     * @name newProjectAttributes
     * @desc Null out the project attributes for the tables that are one-to-one
     *        with projectID, to prepare for the form on the "Add a project" 
     *        view.
     */
    function newProjectAttributes() {
      _.each(["description", "portfolio", "project"], function(tableName) {
          if (typeof service.projectAttributes == "undefined") {
            service.projectAttributes = new Object;
          }
          service.projectAttributes[tableName] = [];
          updateProjAttrsFromRawItem(tableName, []);
      });
      service.clearAllErrors();
    }

    function RestoreState() {
      var data = angular.fromJson(sessionStorage.attributesService);
      if (data) {
        service.formlyFields = data.formlyFields;
        service.formlyOptions = data.formlyOptions;
        service.currentState = data.currentState;
      }
    };

    function SaveState() {
      var data = new Object;
      data.formlyFields = service.formlyFields;
      data.formlyOptions = service.formlyOptions;
      data.currentState = service.currentState;
      sessionStorage.attributesService = angular.toJson(data);
    };
    
    /**
     * @name setAllAttributes
     * @desc Save the server response to a server request made by the
     *        updateAllAttributes method. Set up parent/child attribute 
     *        relationships.
     */
    function setAllAttributes(response) {
      service.allAttributes = response.data;
      var parents = _.filter(response.data, function(attr) {
        if (attr.child) return true;
      });
      _.each(parents, function(parent) {
        var child = parent.child;
        service.allAttributes[child.name] = child;
      });
    };

    /**   
     *  Data for items with multiple instances per project (dispositions and
     *  comments) are stored as raw items, separate from project attributes.
     *  By passing in primary key attributes (with values) that identify the
     *  selected instance, we can find the selected item and set the project
     *  attribute values from that instance. We save the primary keys as a
     *  signature of the selected state, if there is one.
     */
    function updateProjAttrsFromRawItem(tableName, keys) {
      if (typeof service.currentState == "undefined") {
        service.currentState = new Object;
      }
      service.currentState.keys = [];
      var raw_items = getRawAttributes(tableName);
      var filtered_items = raw_items;
      if (typeof filtered_items == "undefined") filtered_items = [];
      var selected;
      _.each(keys, function(key) {
        var value = getValueFromKey(key);
        filtered_items = _.filter(filtered_items, function(item) {
          if ((typeof item[key.name].id == "undefined" && item[key.name] == value)
              || (typeof item[key.name].id != "undefined" && item[key.name].id == value)) {
            service.currentState.keys.push(key);
            return true;
          }
        });
      });
      if (filtered_items.length) {
        /*  Got one. Extract a list of attributes from the raw item and merge
         *  with allAttributes. Set up parent/child attributes. */
        selected = filtered_items[0];
        var attributes = [];
        _.each(Object.keys(selected), function(key) {
          if (_.last(key.split(".")) == "printValue") {
            return;
          }
          attributes.push({name: key, value: selected[key]});
        });

        service.projectAttributes[tableName] = [];
        _.each(attributes, mergeAttributeWithValue, tableName);
 
        var parents = _.filter(service.projectAttributes[tableName], function(attr) {
          if ("child" in attr) {
            return true;
          }
        });
        _.each(parents, function(parent) {
          var childName = parent.child.name;
          parent.child = service.allAttributes[childName];
        });
        SaveState();
        return selected;
      }
      else {
        /* we must be adding a raw item. Set primary key values to 0 to tell
         * the back end to insert instead of update. */
        var tableAttrs = _.where(service.allAttributes, {table: tableName});
        if (typeof service.projectAttributes == "undefined") {
          service.projectAttributes = new Object;
        }
        service.projectAttributes[tableName] = [];
        _.each(tableAttrs, function(attr) {
          if (attr.name == 'commentID') {
            attr.value = 0;
          }
          else if (attr.computed) {
            return;
          }
          else if (_.contains(["multipleSelect", "dateRangeSelect"], attr.format)) {
            attr.value = [];
          }
          else {
            attr.value = "";
          }
          service.projectAttributes[tableName].push(attr);
        });
      }
      SaveState();
    }
    
    /**
     * @name updateAllAttributes
     * @desc Request the full list of attribute objects from the server. Each 
     *        object has all of the information required to render an input
     *        field for a particular project attribute, except for a value.
     * @returns {Object} - promise resolved after data have been received and
     *        saved
     */
    function updateAllAttributes() {
      var deferred = $q.defer();
      var request = {
          method: "POST",
          url: "/getAllAttributes",
          headers: {
	  	      "Content-Type": "application/json; charset=UTF-8",
	  	      "X-CSRFToken": window.csrf_token
          }
      }
      $http(request)
        .then(function(response) {
          service.setAllAttributes(response);
          deferred.resolve();
        });
      return deferred.promise;
    };

    /**
     * @name updateErrors
     * @desc Set data from an updateProjectAttributes call response to be used
     *        to display server errors and and form errors reported by the 
     *        server
     * @param {Object} response - JSON server response to the request for a
     *        project update.
     */
    function updateErrors(response) {
      if (response.status == 400 && response.data.description == "Token is expired") {
        service.server_error = "Your session has expired. Please log out and login again.";
      } 
      else if (response.status != 200) {
        service.server_error = response.statusText;
      }
      if (typeof response.data.errors == "undefined") {
        /* no validation errors */
        return;
      }
      var errors = response.data.errors;
      _.each(Object.keys(errors), function(key) {
        var attr = service.getAttribute(key);
        attr.errors = errors[key];
       });
    };

    /**
     * @name updateFormlyFields
     * @desc Request a full list of formly field objects from the server
     *       and save them
     * @returns {Object} - promise resolved after data have been received and
     *        saved
     */
    function updateFormlyFields() {
      var deferred = $q.defer();
      var request = {
        method: "POST",
        url: "/getFormlyFields",
        headers: {
		      "Content-Type": "application/json; charset=UTF-8",
		      "X-CSRFToken": window.csrf_token
        }
      };
      $http(request)
        .then(function(response) {
          service.formlyFields = response.data;
          deferred.resolve();
        });
      return deferred.promise;
    }
    
    /**
     * @name updateProjectAttributes
     * @desc Save the response to a 
     */
    function updateProjectAttributes(result, params) {
      service.currentState = new Object;
      service.currentState.keys = [];
      service.currentState.projectID = result.data.projectID;
      service.csrf_token = result.data.csrf_token;
      service.errors = result.data.errors;
      service.clearAllErrors();
      delete service.success;
      service.updateErrors(result);
/*      if (result.statusText == "OK") {
        _.each(result.data.formData, updateProjectAttributesFromForm);
      }
      if (typeof params != "undefined" && ("disposedInFY" in params || "disposedInQ" in params)) {
        updateProjAttrsFromRawItem("disposition", [
                                    {name: 'disposedInFY', value: {id: params.disposedInFY}}, 
                                    {name: 'disposedInQ', value: {id: params.disposedInQ}}
                                   ]);
      }
      else if (typeof params != "undefined" && "commentID" in params) {
        updateProjAttrsFromRawItem("comment", 
                                   [{name: 'commentID', value: {id: params.commentID}}]);
      }
*/
      return;
    };

    /**
     *  updateProjectAttributesFromForm
     *
     *  Update old results with new results where possible. If a new item appears,
     *  make it be the live item. A bit more care is required for the tables that
     *  can have multiple results (disposition or comments). Look for matches by
     *  unique ID column on the table.
     */
    function updateProjectAttributesFromForm(form) {
      var tableData = new Object;
      tableData.tableName = form.tableName;

      if (_.isArray(form.attributes[0].attributes)) { // disposition or comments
        if (typeof service.rawAttributes == "undefined") {
          service.rawAttributes = new Object;
        }
        service.rawAttributes[tableData.tableName] = [];
        _.each(form.attributes, function(subform) {
          if (subform.attributes.length) {
            var formObj = new Object;
            _.each(subform.attributes, function(attr) {
              formObj[attr.name] = attr.value;
              if (typeof attr.printValue != "undefined") {
                formObj[attr.name+".printValue"] = attr.printValue;
              }
            });
            service.rawAttributes[tableData.tableName].push(formObj);
          }
        });
      }
      else {
        if (typeof service.projectAttributes == "undefined") {
          service.projectAttributes = new Object;
        }
        service.projectAttributes[tableData.tableName] = [];
        _.each(form.attributes, mergeAttributeWithValue,
          tableData.tableName);
      }
      return;
    }
  }
  
}());
