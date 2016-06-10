(function() {

  /**
   *  @name projectDataService
   *  @desc A factory for the primary service that manages the data associated 
   *        with the Project tab. That is a lot, and it gets help from a couple
   *        of other services: 
   *
   *          attributesService - for lower level data attribute management 
   *            (from the app.attributes module).
   *          loginStateService - a service from the app.login module for 
   *            logging in and out and reporting user roles.
   *          projectListService - for the data that support the Previous and
   *            Next top-level tabs, and also remember just which projects were
   *            selected by your last filter or breakdown by attribute.
   *          stateLocationService - a service from the app.stateLocation
   *            module. It handles the interaction between state changes and
   *            location changes, and allows the user change the state of the
   *            application by typing in the browser location bar. For example
   *            you can change which project you are working on by changing
   *            the projectID in the location bar, and you can change the
   *            project selection query for a report by changing the query
   *            string in the location bar.
   */

  "use strict";
  
  angular
    .module("app.project")
    .factory("projectDataService", projectDataService);
  
  projectDataService.$inject = ["$rootScope", "$http", "$state", "$stateParams", 
                                "$q", "$location", "$timeout", "moment",
                                "attributesService", "loginStateService", 
                                "projectListService", "stateLocationService"];
  
  function projectDataService($rootScope, $http, $state, $stateParams, $q,
                              $location, $timeout, moment, attributesService, 
                              loginStateService, projectListService, 
                              stateLocationService) {
    
    /** service to be returned by this factory */
    var service = {
      addProject: addProject,
      attributes: attributesService.getAllAttributes,
      cancelAddProject: cancelAddProject,
      changeMode: changeMode,
      createProject: createProject,
      currentMode: currentMode,
      currentSubtab: currentSubtab,
      editMode: editMode,
      //getFieldDataFromResult: getFieldDataFromResult,
      getProjectData: getProjectData,
      getProjectDataValues: getProjectDataValues,
      getProjectAttributes: attributesService.getProjectAttributes,
      getProjectDataFromLocation: getProjectDataFromLocation,
      hideDetails: hideDetails,
      initService: initService,
      jsonToModel: jsonToModel,
      jumpToAtachFile: jumpToAtachFile,
      jumpToAddForm: jumpToAddForm,
      jumpToNewProject: jumpToNewProject,
      modelToJSON: modelToJSON,
      printValue: attributesService.printValue,
      RestoreState: RestoreState,
      rootScope: $rootScope,
      saveProject: saveProject,
      SaveState: SaveState,
      setProjectData: setProjectData,
      showDetails: showDetails,
      showEditSuccess: showEditSuccess,
      stateParams: $stateParams,
      tableToJSON: tableToJSON,
      valueToJSON: valueToJSON,
      viewUrl: $state.current.data ? $state.current.data.viewUrl : "",
    };
    
    initService();
    
    //$rootScope.$on("savestate", service.SaveState);
    $rootScope.$on("restorestate", service.RestoreState);
    $rootScope.$on("$locationChangeSuccess", function() {

      /** if we landed under the Project tab ... */
      if (_.first($state.current.name.split(".")) == "project") {

        service.RestoreState();
        if (typeof service.projectID == "undefined" || 
            parseInt($state.params.projectID) != service.projectID) {
          service.initService();
        }
      }
    });

    return service;
    
    /**
     * @name addProject
     * @desc Start the process of creating a new project by collecting the 
     *        attributes of the new project and making a call to the server
     *        for a fresh csrf token.
     */
    function addProject() {
      /** Gather all of the form data values by pulling them from the 
       *  attributes in memory that are marked as associated with the
       *  description table. We don't look at the form -- we use it mostly
       *  for validation (if there were any required fields) and the unsaved
       *  data check. 
       *  */
      var formData = attributesService.getFormData('description', []);
      /* start with a fresh csrf token */
      var request = {
        method: "POST",
        url: "/getProjectAttributes/0",
        headers: {
          "Content-Type": "application/json; charset=UTF-8",
          "X-CSRFToken": window.csrf_token
        }
      };
      $http(request)
        .then(function(response) {
          createProject(response, formData);
        });
    }
    
    /**
     *  @name cancelAddProject
     *  @desc Cancel out of the Add a Project screen (under the Select tab) by
     *        navigating back to the select state
     */
    function cancelAddProject() {
      $state.go("select.home");
    }

    /**
     *  @name changeMode
     *  @desc a function for navigating between the views under the Project tab
     *        for a specified project
     *  @param {string} mode - the name of a state under the "project" virtual
     *        state or "view" as an alias for "project.detail".
     */
    function changeMode(mode) {
      if (!mode) {
        $state.go("project.detail", {projectID: service.projectID});
      }
      else {
        $state.go(mode, {projectID: service.projectID});
      }
    }
    
    /**
     *  @name createProject
     *  @desc Gather form data for creating a new project and send it to the 
     *        back end to create a new project in the database. The response
     *        from that server request is handed to a callback that navigates
     *        to that new project. Only data saved in the description table
     *        is shown on the add form. Data for other tables can be added
     *        once the project has been created.
     *  @callback jumpToNewProject
     */
    function createProject(response, formData) {
      /** save the new csrf token */
      formData.csrf_token = response.data.csrf_token;

      delete formData.projectID;
      var request = {
        method: "POST",
        url: "/projectCreate",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
          "X-CSRFToken": formData.csrf_token
        },
        /** We use jQuery.param to serialize the data -- Python, or
         *  at least Flask, has a problem with the angularjs serializer. */
        data: jQuery.param(formData, true)
      };
      var create_response;
      $http(request)
        .then(function(create_response) {
          service.setProjectData(create_response, {projectID: create_response.data.projectID});
          var new_projectID = projectListService.updateAllProjects(create_response.data.projectID);
          return new_projectID;
        })
        .then(function(new_projectID) {
          service.jumpToNewProject(new_projectID);
        });
    };

    /**
     *  @name currentMode
     *  @desc return the current mode
     *  @returns {string} "view" if state name is "project.detail" else state 
     *        name
     */
    function currentMode() {
      if ($state.current.name == "project.detail") {
        return "view";
      }
      var state_path = $state.current.name.split(".");
      state_path.shift();
      state_path.shift();
      return state_path.join(".");
    }
    
    /**
     *  @name currentSubtab
     *  @desc return the current project edit subtab
     *  @returns {string} "view" if state name is "project.detail" else state 
     *        name
     */
    function currentSubtab() {
      var state_path = $state.current.name.split(".");
      state_path.shift();
      return state_path.shift();
    }
    
    /**
     *  @name editMode
     *  @desc return the answer to the question "am I in edit mode?"
     *  @returns {Boolean}
     */    
    function editMode() {
      if ($state.current.name.indexOf("edit") > -1) {
        return true;
      }
      return false;
    }
    
    /**
     *  @name getProjectData
     *  @desc Get all of the project attributes values from the server. In a
     *        callback, these values are merged with attributes held by the
     *        attributesService from the app.attributes module/
     *  @param {Object} params - a $stateParams object or a custom object
     *        with the same attributes, passed to the callback function.
     *  @callback setProjectData
     *  @returns {Object} - a promise that is resolved once the response 
     *        from the back end has been saved.
     */
    function getProjectData(params) {
      var deferred = $q.defer();
      if (parseInt(params.projectID) > -1) {
        var request = {
          method: "POST",
          url: "/getProjectAttributes/" + params.projectID,
          headers: {
            "Content-Type": "application/json; charset=UTF-8",
            "X-CSRFToken": window.csrf_token
          }
        };
        $http(request)
          .then(function(response) {
            service.setProjectData(response, params);
            /** get the details right */
            if ("commentID" in params) {
              var commentID = attributesService.getAttribute("commentID");
              commentID.value = params.commentID;
              var keys = [commentID];
              attributesService.updateProjAttrsFromRawItem("comment", keys);
            }
            deferred.resolve(params);
        });
      }
      return deferred.promise;
    }
    
    /**
     * @name getProjectDataValues
     * @desc Get all data for a project as an object with attributes and 
     *       save them.
     * @param {Object} params - a $stateParams object or a custom object
     *       with the same attributes, passed to the callback function.
     * @returns {Object} - a promise that is resolved once the response 
     *       from the back end has been saved.
     */
    function getProjectDataValues(params) {
      var deferred = $q.defer();
      if (parseInt(params.projectID) > -1) {
        var request = {
          method: "POST",
          url: "/getProjectAttributes/" + params.projectID,
          headers: {
            "Content-Type": "application/json; charset=UTF-8",
            "X-CSRFToken": window.csrf_token
          }
        };
        $http(request)
          .then(function(response) {
            service.setProjectData(response, params);
            deferred.resolve(params);
        });
        return deferred.promise;
      }
    }
    
    /**
     *  @name getProjectDataFromLocation
     *  @desc Generate an analogue for $state and $stateParams by looking at
     *        the location instead of state, and use those parameters for 
     *        getting data for that project. This allows you to change the
     *        projectID in the location bar and have the application change
     *        state to match what you typed.
     */
    function getProjectDataFromLocation() {
      var state = stateLocationService.getStateFromLocation();
      if ("projectID" in state.params && state.params.projectID != service.projectID) {
        service.projectID = state.params.projectID;
        service.getProjectData(state.params);
        projectListService.setProjectID(service.projectID);
      }
    }

    /**
     *  @name hideDetails
     *  @desc a function for canceling out of Add a Comment or Add a Disposition
     *        by navigating away to the project edit Comments or Dispositions
     *        sub-tab, respectively. Add a Comment users may not have a role
     *        that gives them access to the edit view, in which case they are
     *        taken back to view mode/state project.detail.
     * @param {string} table_name - "comment" for Add a Comment, "disposition" 
     *        for Add a Disposition.
     * @param {Object[]} keys - 
     */
    function hideDetails(table_name, keys) {
      var selected = attributesService.updateProjAttrsFromRawItem(table_name, keys);
      if (loginStateService.canEditProjects()) {
        $state.go("project." + table_name + ".edit", {projectID: $state.params.projectID});
      }
      else {
        $state.go("project.detail", {projectID: $state.params.projectID});
      }
    }

    /**
     *  @name initService
     *  @desc called onEnter from projectConfig.js to ensure that data for the
     *        report from the backend are already in hand (or promised).
     * @returns {Object} promise - a promise that is resolved after project 
     *        have been received and saved.
     */
    function initService() {
      
      var deferred = $q.defer();

      /** project id from state params */
      var state_projectID = parseInt($stateParams.projectID);

      /** projectID saved in the project list service */
      var saved_projectID = projectListService.getProjectID();

      projectListService.setProjectID(state_projectID);
      if (state_projectID && state_projectID > -1 
          && saved_projectID != state_projectID){
        /** then the data we want is not what we have, so ... */
        service.getProjectDataValues($stateParams);
      }
      else if (saved_projectID && saved_projectID == state_projectID
               &&  typeof service.projectModel == "undefined") {
        /** we should be good to go but there are no saved data, 
         *  so ... */
        service.getProjectDataValues($stateParams);
      }
      else {
        deferred.resolve();
      }
      return deferred.promise;
    }

    function jumpToAtachFile() {
      $state.go("project.attach", {projectID: service.projectID});
    };
    
    /**
     *  @name jsonToModel
     *  @desc Return a model that contains date objects built from a json
     *        object with ISO 8601 strings. Original from:
     *          http://aboutcode.net/2013/07/27/json-date-parsing-angularjs.html
     *
     *        Modified for date range, which is two date strings joined by "/". 
     *
     *        Requires moment and moment-range. We use moment because if we
     *        instantiate an object with a date string (YYY-MM_DD), we need to
     *        send a date string back to the server when we submit the model.
     *  @param {Object} json object to be scanned.
     *  @returns {Object} - a fully copy of the input json, with date strings
     *        turned into date, datetime, or date range objects.
     */
    function jsonToModel(json) {
      // No processing for things that are not objects.
      if (typeof json !== "object") return json;

      var model = new Object;
      _.each(Object.keys(json), function(key) {
        if (!json.hasOwnProperty(key)) return;

        var json_value = json[key];
        var match;
        
        // Check for daterange strings, which contain two date strings joined by "/"
        if (typeof json_value === "string" && json_value.split("/").length == 2) {
          /* Split on "/", send both to jsonToModel, and check that what we get
           * back is a list of moment objects and/or empty strings. */
          var values = json_value.split("/");
          _.map(values, function(val) {
              if (val == "") {return null;}
              else {return val;}
          });
          if (values[0] == "") values[0] = null;
          if (values[1] == "") values[1] = null;
          var range_model = jsonToModel(values);

          if ((range_model[0].hasOwnProperty("_isAMomentObject") || values[0] == null) && 
              (range_model[1].hasOwnProperty("_isAMomentObject") || values[1] == null)) {

             model[key] = moment.range(range_model[0], range_model[1]);
          }
        } 
        // Check for string value that looks like a single date.
        else if (typeof json_value === "string" && (match = json_value.match(/^([\+-]?\d{4}(?!\d{2}\b))((-?)((0[1-9]|1[0-2])(\3([12]\d|0[1-9]|3[01]))?|W([0-4]\d|5[0-2])(-?[1-7])?|(00[1-9]|0[1-9]\d|[12]\d{2}|3([0-5]\d|6[1-6])))([T\s]((([01]\d|2[0-3])((:?)[0-5]\d)?|24\:?00)([\.,]\d+(?!:))?)?(\17[0-5]\d([\.,]\d+)?)?([zZ]|([\+-])([01]\d|2[0-3]):?([0-5]\d)?)?)?)?$/))) {
          model[key] = moment.utc(match[0]);
        } 
        
        else if (json_value !== null && typeof json_value === "object") {
          if (_.isArray(json_value)) {
            var array = [];
            _.each(json_value, function(item) {
                array.push(jsonToModel(item));
              });
            model[key] = array;
          }
          else {
            // Recurse into object's attributes
            model[key] = jsonToModel(json_value);
          }
        }
        else {
          model[key] = json_value;
        }
      });
      return model;
    }

    /**
     *  @name jumpToAddForm
     *  @desc Prepare for adding a comment or disposition by nulling out the
     *        project attribute values for the corresponding table. To make
     *        that work, the keys parameter values must have id=0, which
     *        cannot be true for primary key columns. After clearing out the
     *        data, 
     */
    function jumpToAddForm(table_name, keys) {
      attributesService.updateProjAttrsFromRawItem(table_name, keys);
      if (_.contains(["comment", "disposition"], table_name)) {
        $state.go("project." + table_name + ".edit", {projectID: $state.params.projectID});
      }
      $state.go("project." + table_name + ".add", {projectID: $state.params.projectID});
    }

    /**
     * @name jumpToNewProject
     * @desc After a new project has been created, jump to the edit view of 
     *        that project.
     */
    function jumpToNewProject(projectID) {
      projectListService.updateAllProjects(projectID);
      $state.go("project.description.edit", {projectID: projectID});
    }
    
    /**
     * @name modelToJSON
     * @desc Convert the service's project model, which contains Javascript
     *       date objects, into JSON suitable for saving and restoring.
     */
    function modelToJSON(model) {
      if (typeof model == "undefined") return;
      var json = new Object;
      var keys = Object.keys(model);
      
      _.each(keys, function(key) {
        var value = model[key];
        json[key] = valueToJSON(key, value);
      });
      return json;
    }

    function RestoreState() {
      if (typeof sessionStorage.projectDataServiceAttributes != "undefined") {
        var data = angular.fromJson(sessionStorage.projectDataServiceAttributes);
        service.restoredParams = data.params;
        service.projectID = data.params.projectID;
        service.csrf_token = data.csrf_token;
        service.projectModel = service.jsonToModel(data.projectModel);
      }
    };

    /**
     * @name saveProject
     * @desc Save edits made to the specified table by sending data back to the
     *        server. Revised data for that table (and a fresh csrf token) are
     *        returned, along with success or error messages.
     * @param {string} table_name - the name of the table being updated.
     * @param {Object[]} keys - list of primary key values used to identify the
     *        record of interest if the table is one-to-many with projectID.
     */
    function saveProject(table_name, keys) {
      //var formData = attributesService.getFormData(table_name, keys);
      var projectID = $state.params.projectID ? $state.params.projectID : "";
      var request = {
        method: "POST",
        url: "/projectEdit/" + projectID + "/" + table_name,
        headers: {
          "Content-Type": "application/json; charset=UTF-8",
          "X-CSRFToken": service.csrf_token
        },
        data: tableToJSON(table_name, service.projectModel) 
      };
       $http(request)
        .then(function (response) {
          if (response.status == 200) {
              service.setProjectData(response, keys);
              service.noCheck = true;
              var stateName = table_name;
              if (table_name == "project") {
                stateName = "projectMan";
              }
              $state.go("project." + stateName + ".edit", {projectID: $state.params.projectID, noCheck: true});
          }
        });
    }

    function SaveState() {
      if (Object.keys(service.projectModel).length == 0) return;
      
      var data = new Object;
      data.params = stateLocationService.getStateFromLocation().params;
      data.csrf_token = service.csrf_token;
      data.projectModel = service.projectModel; 
      sessionStorage.projectDataServiceAttributes = angular.toJson(service.modelToJSON(data));
    };
      
    /**
     * @name setProjectData
     * @desc Save project data sent from the back end. Make the project sent 
     *        back be the current project, update project attributes values,
     *        and handle success/error messages.
     */
    function setProjectData(result, params) {
      service.projectID = result.data.projectID;
      service.csrf_token = result.data.csrf_token;
      service.success = result.data.success;
      service.error = result.data.error;

      if (typeof service.projectModel == "undefined") {
        service.projectModel = jsonToModel(result.data.formData);
      }
      else {
        Object.assign(service.projectModel, jsonToModel(result.data.formData))
      }

      service.SaveState();

      // Make the project sent back be the current project:
      projectListService.setProjectID(result.data.projectID);

      /** mark the form as $pristine. Only the controller can do that so give
          it a ping. */
      $rootScope.$broadcast("setProjectFormPristine");
    }

    /**
     * @name showDetails
     * @desc The edit view for tables that are one-to-many with projectID 
     *        consist of a list of all the rows in the table for the current
     *        project. Each row has an Edit button to open a showDetails
     *        state with an edit form for that row. This method is the action
     *        linked to those edit buttons. The data for the selected item is
     *        copied into the project attributes for this project and then
     *        handled like a table that is one-to-one with projectID.
     * @param {string} table_name
     * @param {Object} keys
     */
    function showDetails(table_name, keys) {
      var selected = attributesService.updateProjAttrsFromRawItem(table_name, keys);
      if (table_name == 'comment') {
        $state.go("project.comment.edit.detail", 
                  {projectID: service.projectID, commentID: selected.commentID});
      }
      if (table_name == 'disposition') {
        $state.go("project.disposition.edit.detail", 
                  {projectID: projectListService.getProjectID(), 
                   disposedInFY: selected.disposedInFY.id,
                   disposedInQ: selected.disposedInQ.id});
      }
    }

    /**
     * @name showEditSuccess
     * @desc Return the truth of the statement "I have a success message that I
     *        I should be showing right now." Returns true if there is a 
     *        success message and the form is in its pristine state.
     * @returns {Boolean} 
     */
    function showEditSuccess() {
      return Boolean(_.contains(projectForm.classList, "ng-pristine") && service.success);
    }
    
    /**
     *  @name tableToJSON
     *  @desc Take a form model for a specified table (where dates are 
     *        represented by javascript Date objects) and return pure JSON. We 
     *        need this for sending form data to the back end. 
     *        Companion to jsonToModel. 
     *  @params {Object} model - model with Date objects.
     *  @returns {Object} JSON object
     */
    function tableToJSON(table_name, model) {
      var fields = attributesService.getFormlyFields(table_name);
      var form_data = new Object;
      
      // Iterate over table fields
      _.each(fields, function (field) {
        var key = field.key;
        var value = model[field.key];
        var json = valueToJSON(key, value);

        // Last modified information is added on the back end.
        if (key.search(/astModified$/) > -1) {
          return;
        }
        else if (key.search(/astModifiedBy$/) > -1) {
          return;
        }
        
        // My back end wants strings instead of numbers.
        else if (typeof json == "number") {
          json = json.toString();
        }
        else if (field.type == "select") {
          // Convert all integer values to strings
          var target = []
          _.map(json, function(item) {
              if (typeof item != "undefined") {
                return item.toString();
              }
              else {
                return item;
              }
            });
          json = target;
        }

        // My back end wants dates without milliseconds
        else if (_.contains(["timestamp", "displayTimestamp"], field.type)) {
          // Take off the microseconds, to make the back end happy.
          if (typeof json != "undefined" && json != null && json.length > 0) {
            json = json.replace(/\.000Z$/, "Z");
          }
        }

        // My back end wants this date range format.
        else if (field.type == "daterange") {
          if (json !==null && typeof json != "undefined") {
            var dates = json.split("/");
            json = "["+ json +"]";      
          }
        }
        form_data[key] = json;
      });
      
      return form_data;
    }
        
    /**
     * @name valueToJSON
     * @desc Convert a value in the project model to JSON. The primary use is
     *       to convert Date objects back into JSON for storage on the back
     *       end, in a format appropriate to a picky back end. Our back end
     *       (SQLAlchemy) is picky, so the JSON for a Date column cannot have
     *       a time in it. We use momentJS to get the control we need, and
     *       moment-range for Daterange columns. Our back end also requires 
     *       us to turn integers into strings. 
     *       
     *       This method is called iteratively to traverse all sub-objects
     *       of the one passed in.
     *  @params {Object} model - model with Date objects.
     *  @returns {Object} JSON object
     */
    function valueToJSON(key, value) {
      // Ignore things that are not objects.
      if (typeof value != "object") return value;

      // Get the formly field for guidance. If there is no field then move on.
      var field = attributesService.getFormlyField(key);
      
      // Don't do anything fancy with null values.
      if (value === null) {
        return null;
      }

      else if (typeof value == "number") {
        return value.toString();
      }

      // Convert date-like objects.
      else if (field && (field.type == "date" || field.type =="datepicker")) { 
        return moment(value).format("YYYY-MM-DD");
      }
      else if (field && field.type == "timestamp") {
        return value.toISOString();
      }
      else if (field && field.type == "daterange") {
        // My backend wants 2 date strings separated by "/"
        return [value.start.format("YYYY-MM-DD"), 
                value.end.utc().format("YYYY-MM-DD")].join("/");
      }
      else if (value._isAMomentObject) {
        return value.toISOString();
      }
      
      // Dive into remaining objects.
      else if (typeof value == "object") {
        /* Should we keep going or not? That is the question. */

        // Is this the project model?
        if (key == "projectModel") {
          return modelToJSON(value);
        }

        // Is it one of the attributes we know about?
        //if (typeof field != "undefined") {
        //  return modelToJSON(value);
        //}

        // Is it one of the tables we know about?
        else if (_.contains(attributesService.getFormlyFormNames(), key)) {
          return tableToJSON(key, value);
        }

        /* Is it a container for a list of tables we know about?
         * By naming convention, items in this category will have a key that 
         * is a table name with "s" appended to the end. So "comments" would
         * contain a list of comment objects. Return a list of converted
         * sub-objects. */
        else if (_.contains(attributesService.getFormlyContainerNames(), key)) {
          var table_name = key.replace(/s$/, "");
          var item_keys = Object.keys(value);
          return _.map(item_keys, function(item_key) {
            return tableToJSON(table_name, value[item_key]);
          });
        }
      }
      
      // No processing required.
      return value;
    }
  }

}());
