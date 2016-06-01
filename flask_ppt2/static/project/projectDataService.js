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
  
  projectDataService.$inject = ["$rootScope", "$http", "$state", "$stateParams", "$q",
                                "$location", "$timeout", "attributesService", "loginStateService", 
                                "projectListService", "stateLocationService"];
  
  function projectDataService($rootScope, $http, $state, $stateParams, $q,
                              $location, $timeout, attributesService, loginStateService,
                              projectListService, stateLocationService) {
    
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
      getProjectData: getProjectData,
      getProjectDataValues: getProjectDataValues,
      getProjectAttributes: attributesService.getProjectAttributes,
      getProjectDataFromLocation: getProjectDataFromLocation,
      hideDetails: hideDetails,
      initService: initService,
      jumpToAtachFile: jumpToAtachFile,
      jumpToAddForm: jumpToAddForm,
      jumpToNewProject: jumpToNewProject,
      printValue: attributesService.printValue,
      RestoreState: RestoreState,
      saveProject: saveProject,
      SaveState: SaveState,
      setProjectData: setProjectData,
      showDetails: showDetails,
      showEditSuccess: showEditSuccess,
      stateParams: $stateParams,
      viewUrl: $state.current.data ? $state.current.data.viewUrl : "",
    };
    
    service.RestoreState();
    if (typeof service.getProjectAttributes() == "undefined" && service.restoredParams) {
      service.getProjectDataValues(service.restoredParams);
    }
    
    $rootScope.$on("savestate", service.SaveState);
    $rootScope.$on("restorestate", service.RestoreState);
    $rootScope.$on("$locationChangeSuccess", function() {

      /** if we landed under the Project tab ... */
      if (_.first($state.current.name.split(".")) == "project") {

        if (!projectListService.hasProjects()) {
          /** then the list of project brief descriptions is empty. Get it */
          projectListService.updateAllProjects()
            .then(service.initService);
        }
        service.RestoreState();
        if (typeof service.projectID == "undefined" || 
            parseInt($state.params.projectID) != service.projectID) {
          service.initService();
        }
      }
    });

    service.SaveState();
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
            else if ("disposedInFY" in params || "disposedInQ" in params) {
              var disposedInFY = attributesService.getAttribute("disposedInFY");
              disposedInFY.value.id = params.disposedInFY;
              var disposedInQ = attributesService.getAttribute("disposedInQ");
              disposedInQ.value.id = params.disposedInQ;
              var keys = [disposedInFY, disposedInQ];
              attributesService.updateProjAttrsFromRawItem("disposition", keys);
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
     * @param {string} tableName - "comment" for Add a Comment, "disposition" 
     *        for Add a Disposition.
     * @param {Object[]} keys - 
     */
    function hideDetails(tableName, keys) {
      var selected = attributesService.updateProjAttrsFromRawItem(tableName, keys);
      if (loginStateService.canEditProjects()) {
        $state.go("project." + tableName + ".edit", {projectID: $state.params.projectID});
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
               &&  typeof service.getProjectAttributes('description') == "undefined") {
        /** we should be good to go but there are no saved data, 
         *  so ... */
        service.getProjectDataValues($stateParams);
      }
      else if (saved_projectID && saved_projectID == state_projectID &&
               (typeof attributesService.getAttribute("name") == "undefined"
                || attributesService.getAttribute("name").value == "")) {
        /** data were wiped out. Perhaps just came from the Add project tab, 
            so ... */
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
     *  @name jumpToAddForm
     *  @desc Prepare for adding a comment or disposition by nulling out the
     *        project attribute values for the corresponding table. To make
     *        that work, the keys parameter values must have id=0, which
     *        cannot be true for primary key columns. After clearing out the
     *        data, 
     */
    function jumpToAddForm(tableName, keys) {
      attributesService.updateProjAttrsFromRawItem(tableName, keys);
      if (_.contains(["comment", "disposition"], tableName)) {
        $state.go("project." + tableName + ".edit", {projectID: $state.params.projectID});
      }
      $state.go("project." + tableName + ".add", {projectID: $state.params.projectID});
    };

    /**
     * @name jumpToNewProject
     * @desc After a new project has been created, jump to the edit view of 
     *        that project
     */
    function jumpToNewProject(projectID) {
      projectListService.updateAllProjects(projectID);
      $state.go("project.description.edit", {projectID: projectID});
    }

    function RestoreState() {
      if (typeof sessionStorage.projectDataServiceAttributes != "undefined") {
        var data = angular.fromJson(sessionStorage.projectDataServiceAttributes);
        service.restoredParams = data.params;
        service.projectModel = data.projectModel;
      }
    };

    /**
     * @name saveProject
     * @desc Save edits made to the specified table by sending data back to the
     *        server. Revised data for that table (and a fresh csrf token) are
     *        returned, along with success or error messages.
     * @param {string} tableName - the name of the table being updated.
     * @param {Object[]} keys - list of primary key values used to identify the
     *        record of interest if the table is one-to-many with projectID.
     */
    function saveProject(tableName, keys) {
      //var formData = attributesService.getFormData(tableName, keys);
      var formData = new Object;

      /* Copy data values from the model to the formData object, using only
       * the fields for the requested table. Integer values of option ids
       * mess up SQLAlchemy on the back end, preventing it from finding 
       * matching list table objects. The last modification data need to
       * be added in the backend, for security. */
      _.each(attributesService.getFormlyFields(tableName), function(field) {
        if (field.key.match(/lastModified\b/ig)) return;
        if (field.key.match(/lastModifiedBy\b/ig)) return;
        var data = service.projectModel[field.key]
        formData[field.key] = typeof data != "number" ? data : data.toString(); 
      });
      formData.csrf_token = service.csrf_token;
      var projectID = $state.params.projectID ? $state.params.projectID : "";
      var request = {
        method: "POST",
        url: "/projectEdit/" + projectID + "/" + tableName,
        headers: {
          //"Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
          "Content-Type": "application/json; charset=UTF-8",
          "X-CSRFToken": service.csrf_token
        },
        //data: jQuery.param(formData, true)
        data: formData // jQuery.param(formData, true)
      };
      $http(request)
        .then(function (request) {
          service.setProjectData(request, keys);
          service.noCheck = true;
          var stateName = tableName;
          if (tableName == "project") {
            stateName = "projectMan";
          }
          $state.go("project." + stateName + ".edit", {projectID: $state.params.projectID, noCheck: true});
        });
    };

    function SaveState() {
      var data = new Object;
      data.params = stateLocationService.getStateFromLocation().params;
      data.projectModel = service.projectModel
      sessionStorage.projectDataServiceAttributes = angular.toJson(data);
    };
      
    /**
     * @name setProjectData
     * @desc Save project data sent from the back end. Make the project sent 
     *        back be the current project, update project attributes values,
     *        and handle success/error messages.
     */
    function setProjectData(result, params) {
      //return;
      service.projectID = projectListService.getProjectID();
      service.csrf_token = result.data.csrf_token;
      if (typeof service.projectModel == "undefined") {
        service.projectModel = result.data.formData;
      }
      else {
        _.each(Object.keys(result.data.formData), function(key){
          service.projectModel[key] = result.data.formData[key];
        });
      }

      // Make the project sent back be the current project:
      projectListService.setProjectID(result.data.projectID);
      //attributesService.updateProjectAttributes(result, params);
      service.success = result.data.success;
      service.error = attributesService.server_error;
      service.SaveState();
      //attributesService.SaveState();
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
     * @param {string} tableName
     * @param {Object} keys
     */
    function showDetails(tableName, keys) {
      var selected = attributesService.updateProjAttrsFromRawItem(tableName, keys);
      if (tableName == 'comment') {
        $state.go("project.comment.edit.detail", 
                  {projectID: service.projectID, commentID: selected.commentID});
      }
      if (tableName == 'disposition') {
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
  }

}());
