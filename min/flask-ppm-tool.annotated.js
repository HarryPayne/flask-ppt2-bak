(function() {
  
  /**
   *  @module PPT
   *  @desc   The parent module for the PPT application
   */
  
  angular
    .module("PPT", [
      "app.attributes",
      "app.comment",
      "app.common",
      "app.curate",
      "app.filter", 
      "app.header", 
      "app.login",
      "app.loginInjectorProvider",
      "app.manage",
      "app.modalConfirm",
      "app.project", 
      "app.report",
      "app.select", 
      "app.stateLocation",
      "app.title",
      "ngSanitize"
    ]);

}());

(function() {
  
  "use strict";
  
  angular
    .module("PPT")
    .config(PPTConfig);
  
  PPTConfig.$inject = ['$urlRouterProvider'];
  
  function PPTConfig($urlRouterProvider) {
    $urlRouterProvider.otherwise('/select/home');
  };
  
}());

(function() {
  
  "use strict";
  
  angular
    .module("PPT")
    .controller("PPTCtrl", PPTCtrl);
  
  PPTCtrl.$inject = ['$rootScope', '$location'];
  
  function PPTCtrl($rootScope, $location) {
    /* */
  }
  
}());
(function() {
  
  "use strict";
  
  angular
    .module("PPT")
    .run(initializeApp);
  
  initializeApp.$inject = ['$rootScope'];
  
  function initializeApp($rootScope) {
    $rootScope.$on("$stateChangeStart", _initializeApp);
    
    function _initializeApp(e, toState, toParams, fromState, fromParams){
      window.onbeforeunload = function (event) {
        // save state before navigating away from the application
        $rootScope.$broadcast('savestate');
      };
      
    }   
  }
  
}());
(function() {

  angular
    .module("app.attributes", ["ui.router"]);

}());
(function() {
  
  "use strict";
  
  angular
    .module("app.attributes")
    .controller("Attributes", Attributes);
  
  Attributes.$inject = ['$scope', '$state', 'attributesService'];
  
  function Attributes($scope, $state, attributesService) {
    
    this.als = attributesService;
    this.attributes = this.als.getAttributes;

  };
  
}());

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
  
  attributesService.$inject = ['$rootScope', '$http', '$q', 'projectListService'];
  
  function attributesService($rootScope, $http, $q, projectListService) {
    var service = {
      addAttrToDataObj: addAttrToDataObj,
      addUniqueAttrToDataObj: addUniqueAttrToDataObj,
      clearAllErrors: clearAllErrors,
      getAttribute: getAttribute,
      getAllAttributes: getAllAttributes,
      getFormData: getFormData,
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
      updateProjectAttributes: updateProjectAttributes,
      updateProjectAttributesFromForm: updateProjectAttributesFromForm
    };


    service.RestoreState();
    if (typeof service.allAttributes == "undefined") {
      service.updateAllAttributes();
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
        return _.sortBy(service.projectAttributes[tableName], "attributeID");
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
        service.allAttributes = data.allAttributes;
        service.currentState = data.currentState;
      }
    };

    function SaveState() {
      var data = new Object;
      data.allAttributes = service.allAttributes;
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
      $http.get("/getAllAttributes")
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
      if (result.statusText == "OK") {
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

(function() {
  
  angular
    .module("app.comment", ["ui.router"]);
  
}());

(function() {
  
  "use strict";
  
  angular
    .module("app.comment")
    .config(commentConfig);
  
  commentConfig.$inject = ['$stateProvider'];

  function commentConfig($stateProvider) {
    $stateProvider
      .state("comment", {
        url: "/comment",
        templateUrl: "/static/comment/comment.html",
        controller: "Comment",
        controllerAs: "comment",
        data: {
          requiresLogin: true
        }
      });
  }
  
}());

(function() {
  
  "use strict";
  
  angular
    .module("app.comment")
    .controller("Comment", Comment);
  
  Comment.$inject = ['$scope', '$rootScope'];
  
  function Comment($scope, $rootScope) {
    
    this.currentUser = $rootScope.currentUser;
  }
  
}());
(function (){
  
  /**
   *  @module app.common
   *  @desc   A module for shared components
   */
  
  angular
    .module("app.common", []);

}());

(function() {
  
  /*
   *  @name jumpToProjectChoice
   *  @desc Render a form with a select element and on submit execute a 
   *        callback function, passing in the input.
   *  
   *  Used under the Select tab to select a project from a list and call a 
   *  function to jump to that project under the Project tab. Here is the HTML 
   *  for the prototype application of this directive:
   *
   *    <div jump-to-project-choice label="'Select'" 
   *      on-submit="select.jumpToProject"
   *      options="select.masterList().allProjects" 
   *      help="'Select a project from the list and go to that project.'"></div>
   *
   *  Notice that the onSubmit reference does not have parentheses at the end.
   *
   *  The attributes for this directive are:
   *
   *    options - a list of objects with "name" and "projectID" attributes for
   *      rendering the option elements for the select element.
   *    help - text for an aria-describedBy block, to explain the use of this
   *      field.
   *    label - text to label the input field.
   *    on-submit - tThe function to be run when the form is submitted.
   */

  "use strict";
  
  angular
    .module("app.common")
    .directive("jumpToProjectChoice", JumpToProjectChoice);
  
  function JumpToProjectChoice() {      
    /**
     *  @name controller
     *  @desc A simple controller for pulling together the form data and the
     *        scope data.
     */
    function controller() {
      this.option;
      this.jump = jump;
    }

    return {
      restrict: "EA",
      scope: {
        help: "=",
        label: "=",
        onSubmit: "&",
        options: "="
      },
      controller: controller,
      controllerAs: "ctrl",
      bindToController: true,
      templateUrl: "static/common/jumpToProjectChoice/jumpToProjectChoice.html",
      link: function(scope, element, attributes, ctrl) {
        /** when the form in the template is submitted call the controller's
            jump function */
        scope.submit = ctrl.jump;
      }
    };

    /**
     *  @name jump
     *  @desc A sneaky way of passing a single item of form data to the external 
     *        function without caring what the parameter name is. We stored a
     *        reference to the function in ctrl.onSubmit. The first pair of
     *        parentheses just gives you the function. The second pair is the
     *        function parameter list.
     */
    function jump() {
      this.ctrl.onSubmit()(this.ctrl.option.projectID);
    }

  };
  
}());

(function() {
  
  /*
   *  @name jumpToProjectID
   *  @desc Render a form with a number type input field and on submit execute
   *        a callback function, passing in the input.
   *  
   *  Used under the Select tab to input a projectID and call a function to 
   *  jump to that project under the Project tab. Here is the HTML for the
   *  prototype application of this directive:
   *
   *    <div jump-to-project-id label="'Jump'" on-submit="select.jumpToProject"
   *      help="'Enter a numeric project ID and go to that project.'"></div>
   *
   *  Notice that the onSubmit reference does not have parentheses at the end.
   */

  "use strict";
  
  angular
    .module("app.common")
    .directive("jumpToProjectId", JumpToProjectID);
  
  function JumpToProjectID() {      
    function controller() {
      this.projectID;
      this.jump = jump;
    }

    return {
      restrict: "EA",
      scope: {
        label: "=",
        help: "=",
        onSubmit: "&"
      },
      controller: controller,
      controllerAs: "ctrl",
      bindToController: true,
      templateUrl: "static/common/jumpToProjectID/jumpToProjectID.html",
      link: function(scope, element, attributes, ctrl) {
        /** when the form in the template is submitted call the controller's
            jump function */
        scope.submit = ctrl.jump;
      }
    };

    /**
     *  @name jump
     *  @desc A sneaky way of passing a single item of form data to the external 
     *        function without caring what the parameter name is. We stored a
     *        reference to the function in ctrl.onSubmit. The first pair of
     *        parentheses just gives you the function. The second pair is the
     *        function parameter list.
     */
    function jump() {
      this.ctrl.onSubmit()(this.ctrl.projectID);
    }

  };
  
}());

(function() {
  
  /**
   *  @name projectDataDisplay
   *  @desc Render project data for a single database table. A header is 
   *        followed by rows in Bootstrap form-horizontal layout, even
   *        in view mode. This is the top of a pyramid of nested directives,
   *        and basically decides which data model to use, based on the table
   *        name passed in. Other attributes are passed down to data model
   *        specific directives. 
   *
   *        Call this directive from inside a form. The form elements are not
   *        rendered here. 
   * 
   *  The attributes for this directive are:
   * 
   *    datasource - a reference to an external function that supplies a list
   *      of items to be rendered. In the case of the tables that are one-to-
   *      one with projectID, these items will be attributes of the project
   *      under consideration. In the case of the one-to-many tables, this will
   *      be the list of items (comments or dispositions) to be listed.
   * 
   *    detailDatasource - a reference to an external function that supplies
   *      a list of attributes for the detail item to be edited. 
   *    detailIsSelected - a reference to a function that returns true when
   *      looping over the one-to-many items and landing on the one the user
   *      has selected.
   *    error - an object with error messages to be shown
   *    header - text for a header for the list of output rows
   *    hide - a reference to the external function to be run to exit from
   *      edit.detail mode back to edit mode.
   *    keys - a list of primary key attributes, used to identify the comment 
   *      or disposition to be edited in edit.detail mode
   *    mode - "view", "edit", or "edit.detail". Passed to the inner directive 
   *      to control the display of each row. In display mode pre-computed 
   *      display values are shown. In edit mode input "widgets" specific to 
   *      the format of each attribute are shown.
   *    onCancelClick - a reference to the external function to be run when the
   *      Cancel button is pressed.
   *    onSaveClick - a reference to the external function to be run when 
   *      the form  button is pressed.
   *    show - a reference to the external function to be run to edit an item
   *      in edit.detail mode.
   *    showSuccess - a reference to the external function to be run to decide
   *      whether a success message should be displayed.
   *    success - an object with success messages to be shown
   *    table - database table/project data category name
   */
  
  "use strict";
  
  angular
    .module("app.common")
    .directive("projectDataDisplay", ProjectDataDisplay);
  
  function ProjectDataDisplay() {
    
    function controller() {
      //this.dataModel = getDataModelFromTable(this.table);
      this.cancel = cancel;
      this.details = details;
      this.detailsObj = detailsObj;
      this.hasAValue = hasAValue;
      this.hasCancel = hasCancel;
      this.hideDetails = hideDetails;
      this.isSelected = isSelected;
      this.save = save;
      this.saveDetails = saveDetails;
      //this.selectedKeys = typeof keys == "function" ? keys() : [];
      this.showDetails = showDetails;
    }
    
    return {
      restrict: "EA",
      scope: {
        datasource: "&",
        detailDatasource: "&",
        detailIsSelected: "&",
        error: "=",
        header: "=",
        hide: "&",
        keys: "=",
        mode: "=",
        onCancelClick: "&",
        onSaveClick: "&",
        show: "&",
        showSuccess: "&",
        success: "=",
        table: "="
      },
      controller: controller,
      controllerAs: "ctrl",
      bindToController: true,
      link: function(scope, element, attributes, ctrl) {
        scope.submit = ctrl.save;
      },
      templateUrl: getTemplateForDataModel
    };

    /**
     * @name cancel
     * @desc Call the function referred to by the onCancelClick attribute
     *        function, which is expected to navigate away to another state.
     */
    function cancel() {
      this.onCancelClick()();
    }

    /**
     *  @name details
     *  @desc Return the results from the detailDatasource attribute function
     *        as a list of attributes.
     *  @returns {Object[]}
     */
    function details() {
      if (typeof this.attributes == "undefined" || this.attributes.length == 0) {
        var attributes = [];
        _.each(this.detailDatasource(), function(attr) {
          if (attr.computed) {
            return;
          }
          if (attr.format.substring(0, "child_for_".length) == "child_for_") {
            return;
          }
          if (attr.name == "commentID") {
            return;
          };
          attributes.push(attr);
        });
        this.attributes = attributes;
      }
      return this.attributes;
    }

    /**
     *  @name detailsObj
     *  @desc Return the results from the detailDatasource attribute function
     *        as an object with attribute name as the key, and attributes as
     *        the values.
     * @returns {Object}
     */
    function detailsObj(name) {
      if (typeof this.attributesObj == "undefined" || Object.keys(this.attributesObj).length == 0) {
        var attributesObj = new Object;
        _.each(this.detailDatasource(), function(attr) {
          attributesObj[attr.name] = attr;
        });
        this.attributesObj = attributesObj;
      }
      if (name in this.attributesObj) {
        return this.attributesObj[name];
      }
    }

    /**
     *  @name getDataModelFromTable
     *  @desc return data model to use based the table directive option. (And
     *        knowledge of the database. Not considering that a problem right
     *        now.)
     *  @param {string} table - table name
     *  @returns {string} ("one"||"comments"||"dispositions")
     */
    function getDataModelFromTable(table) {
      var oneToOneTables = ["'description'", "'portfolio'", "'project'"];
      if (_.contains(oneToOneTables, table)) {
        return "one";
      }
      else if (table == "'comment'") {
        return "comments";
      }
      else if (table == "'disposition'") {
        return "dispositions";
      }
    }

    /**
     * @name getTemplateForDataModel
     * @desc Return the templateUrl appropriate for the table specified by the
     *       table attribute. 
     * @param 
     */
    function getTemplateForDataModel(element, attributes) {
      var model = getDataModelFromTable(attributes.table);
      if (model == "one") {
        return "static/common/projectDataDisplay/oneToOneDataModel.html";
      }
      else if (model == "comments") {
        return "static/common/projectDataDisplay/commentsDataModel.html";
      }
      else if (model == "dispositions") {
        return "static/common/projectDataDisplay/dispositionsDataModel.html";
      }
    }

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
     *  @name hasAValue
     *  @desc Call this function to determine whether the attribute has a value.
     *        In view mode, only project attributes that have a value are listed.
     */
    function hasAValue(attr) {
      if ("value" in attr) {
        if (typeof attr.value == "string") {
          if (attr.value != "") {
            return true;
          }
        } 
        else if (typeof attr.value == "object" && Boolean(attr.value) && "id" in attr.value) {
          if (!_.isArray(attr.value)) {
            if (Boolean(attr.value.desc) && attr.value.id != null  && attr.value != "" && attr.value != []) {
              return true;
            }
          }
          else if (attr.value.length) {
            return true
          }
          return false;
        }
        else if (attr.value != null && attr.value != "" && attr.value != []) {
          return true;
        }
      }
      return false;
    }

    /**
     * @name cancel
     * @desc Return the truth of the statement "this directive has a value for
     *        the onCancelClick attribute function."
     */
    function hasCancel() {
      return (typeof this.onCancelClick() != "undefined");
    }

    /**
     *  @name hideDetails
     *  @desc Call the function set in the directive "hide" option, which hides
     *        the edit.details view (and clears the form).
     * @param {string} table - the name of the table being updated
     * @param (Object[]) keys - a list of primary key attribute objects, sent
     *        to identify the database entry to be updated
     */
    function hideDetails(table, keys) {
      this.hide()(table, keys)
    }

    /**
     * @name isSelected
     * @desc Return the truth of the statement "this is the item you want to 
     *        work on." The primary key values of the item are compared with
     *        the primary key values specified by the keys attribute.
     */
    function isSelected(item) {
      if (typeof item == "undefined" || typeof this.keys == "undefined" || this.keys.length == 0 ) {
        return false;
      }
      var selected = false;
      _.each(this.keys, function(key){
        var value = getValueFromKey(key);
        if ((typeof item[key.name].id == "undefined" && item[key.name] == value)
            || (typeof item[key.name].id != "undefined" && item[key.name].id == value)) {
          selected =  true;
        }
        else {
          selected = false;
        }
      });
      return selected;
    }

    /**
     *  @name save
     *  @desc When the form wrapping the directive is submitted, call the 
     *        function specified by the onSaveClick parameter
     */
    function save(table, keys) {
      this.onSaveClick()(table, keys);
    }

    function saveDetails(table, keys) {
      this.onSaveClick()(table, keys);
    }

    /**
     *  @name showDetails
     *  @desc Call the function set in the directive "show" option, which shows
     *        the edit.details view.
     * @param {string} table - the name of the table being updated
     * @param (Object[]) keys - a list of primary key attribute objects, sent
     *        to identify the database entry to be updated
     */
    function showDetails(table, keys) {
      this.show()(table, keys);
    }

  }
  
}());

(function() {
  
  "use strict";
  
  angular
    .module("app.common")
    .directive("projectDataCommentDetail", ProjectDataCommentDetail);
  
  function ProjectDataCommentDetail() {
    
    function controller() {
      var vm = this;
    }

    return {
      controller: controller,
      controllerAs: "detailCtrl",
      restrict: "EA",
      templateUrl: "static/common/projectDataFormatDirectives/projectDataCommentDetail.html",
      link: function(scope, element, attributes, ctrl) {
        console.log("");
      },
    };
    
  }
  
}());

(function() {
  
  "use strict";
  
  angular
    .module("app.common")
    .directive("projectDataComment", ProjectDataComment);
  
  function ProjectDataComment() {
    
    return {
      restrict: "EA",
      templateUrl: "static/common/projectDataFormatDirectives/projectDataComment.html"
    };
    
  }
  
}());

(function() {
  
  "use strict";
  
  angular
    .module("app.common")
    .directive("projectDataDate", ProjectDataDate);
  
  function ProjectDataDate() {
    
    return {
      restrict: "EA",
      templateUrl: "static/common/projectDataFormatDirectives/projectDataDate.html" 
    };
    
  }
  
}());

(function() {
  
  "use strict";
  
  angular
    .module("app.common")
    .directive("projectDataDateRangeSelect", ProjectDataDateRangeSelect);
  
  function ProjectDataDateRangeSelect() {
    
    return {
      restrict: "EA",
      templateUrl: "static/common/projectDataFormatDirectives/projectDataDateRangeSelect.html" 
    };
    
  }
  
}());

(function() {
  
  "use strict";
  
  angular
    .module("app.common")
    .directive("projectDataDispositionDetail", ProjectDataDispositionDetail);
  
  function ProjectDataDispositionDetail() {
    
    function controller() {
      var vm = this;
    }

    return {
      restrict: "EA",
      templateUrl: "static/common/projectDataFormatDirectives/projectDataDispositionDetail.html"
    };
    
  }
  
}());

(function() {
  
  "use strict";
  
  angular
    .module("app.common")
    .directive("projectDataDisposition", ProjectDataDisposition);
  
  function ProjectDataDisposition() {
    
    return {
      restrict: "EA",
      templateUrl: "static/common/projectDataFormatDirectives/projectDataDisposition.html"
    };
    
  }
  
}());

(function() {
  
  "use strict";
  
  angular
    .module("app.common")
    .directive("projectDataMultipleSelect", ProjectDataMultipleSelect);
  
  function ProjectDataMultipleSelect() {
    
    return {
      restrict: "EA",
      templateUrl: "static/common/projectDataFormatDirectives/projectDataMultipleSelect.html" 
    };
    
  }
  
}());

(function() {
  
  "use strict";
  
  angular
    .module("app.common")
    .directive("projectDataNumber", ProjectDataNumber);
  
  function ProjectDataNumber() {
    
    return {
      restrict: "EA",
      templateUrl: "static/common/projectDataFormatDirectives/projectDataNumber.html" 
    };
    
  }
  
}());

(function() {
  
  "use strict";
  
  angular
    .module("app.common")
    .directive("projectDataString", ProjectDataString);
  
  function ProjectDataString() {
    
    return {
      restrict: "EA",
      templateUrl: "static/common/projectDataFormatDirectives/projectDataString.html" 
    };
    
  }
  
}());

(function() {
  
  "use strict";
  
  angular
    .module("app.common")
    .directive("projectDataTextArea", ProjectDataTextArea);
  
  function ProjectDataTextArea() {
    
    return {
      restrict: "EA",
      templateUrl: "static/common/projectDataFormatDirectives/projectDataTextArea.html" 
    };
    
  }
  
}());


(function() {
  
  angular
    .module("app.curate", ["ui.router"]);
  
}());

(function() {
  
  "use strict";
  
  angular
    .module("app.curate")
    .config(curateConfig);
  
  curateConfig.$inject = ['$stateProvider'];
  
  function curateConfig($stateProvider) {
    $stateProvider
      .state("curate", {
        url: "/curate",
        templateUrl: "/static/curate/curate.html",
        controller: "Curate",
        controllerAs: "curate",
        data: {
          requiresLogin: true
        }
      });
  }
  
}());

(function() {
  
  "use strict";
  
  angular
    .module("app.curate")
    .controller("Curate", Curate);
  
  Curate.$inject = ['$scope', '$rootScope'];
  
  function Curate($scope, $rootScope) {
    
    this.currentUser = $rootScope.currentUser;

  };
  
}());

(function() {
  
  angular
    .module("app.filter", []);
    
}());

(function (){
  
  /**
   *  @name FilterBuilderService
   *  @desc A factory for the service that support the Filter Builder view
   *        under the Filter Builder tab.
   */
  
  "use strict";
  
  angular
    .module("app.filter")
    .factory("FilterBuilderService", FilterBuilderService);
  
  FilterBuilderService.$inject = ['projectListService', 'reportTableService', 'stateLocationService'];
  
  function FilterBuilderService(projectListService, reportTableService, 
                                stateLocationService) {

    /** service to be returned by this factory */
    var service = {
    };

    $rootScope.$on("savestate", service.SaveState);
    $rootScope.$on("restorestate", service.RestoreState);
    
    return service;

  }
  
}());

(function() {
  
  /**
   *  @name filterConfig
   *  @desc Configuration for app.filter module
   */
  
  "use strict";
  
  angular
    .module("app.filter")
    .config(filterConfig);
  
  filterConfig.$inject = ['$stateProvider'];
  
  function filterConfig($stateProvider) {
    $stateProvider
      .state("filter", {
        /** virtual root state */
        url: "/filter",
        controller: "Filter",
        controllerAs: "filter",
        templateUrl: "/static/filter/filter.html",
        data: {
          requiresLogin: false
        }
       })
      .state("filter.builder", {
        /** state for filter builder to change query string */
        url: "/builder/:query_string",
        templateUrl: "/static/filter/templates/builder.html",
        resolve: {
          query_string: ['$stateParams', function($stateParams) {
            return $stateParams.query_string;
          }]
        },
        /** service initialization */
        onEnter: ['reportTableService', function(reportTableService) {
            reportTableService.initService();
          }
        ]

      })
      .state("filter.builder.attributes", {
        url: "/attributes/:attribute_list",
        templateUrl: "/static/filter/templates/attributes.html",
        controller: ['$stateParams', 'query_string', function ($stateParams, query_string) {
          $stateParams.query_string = query_string;
          console.log($stateParams, query_string);
        }]
      });
  };
  
}());

(function() {
  
  "use strict";
  
  angular
    .module("app.filter")
    .controller("Filter", Filter);
  
  Filter.$inject = ['projectListService', 'selectStateService'];
  
  function Filter(projectListService, selectStateService) {
    
    this.ls = projectListService;
    this.masterList = projectListService.getMasterList;
    this.jumpToProject = this.ls.jumpToProject;
    
    this.selectState = selectStateService;

  };
  
}());

(function() {
  
  angular
    .module("app.header", ["ui.router"]);
  
}());

(function() {
  
  "use strict";
  
  angular
    .module("app.header")
    .controller("Header", Header);
  
  Header.$inject = ['$rootScope', '$state', 'projectListService', 'loginStateService'];
  
  function Header($rootScope, $state, projectListService, loginStateService) {
    var vm = this;
    
    this.currentUser = $rootScope.currentUser;
    this.masterList = projectListService.getMasterList;
    this.getSql = projectListService.getSql;
    this.getNextID = projectListService.getNextID;
    this.getPreviousID = projectListService.getPreviousID;
    this.getProjectID = projectListService.getProjectID;
    this.hasNextID = projectListService.hasNextID;
    this.hasPreviousID = projectListService.hasPreviousID;

    this.loggedIn = loginStateService.loggedIn;
    this.login = loginStateService.login;
    this.logout = loginStateService.logout;

    this.jumpToNextProject = jumpToNextProject;
    this.jumpToPreviousProject = jumpToPreviousProject;
    
    $rootScope.$on("$stateChangeSuccess", function(e, toState){
      vm.isActive = isActive;
      vm.hasNext = hasNext;
      vm.hasPrevious = hasPrevious;

      function isActive(name) {
        return toState.name.split(".")[0] === name;
      }; 
  
      function hasNext() {
        return (vm.isActive("project") && vm.masterList().next > -1);
      };
  
      function hasPrevious() {
        return (vm.isActive("project") && vm.masterList().previous > -1);
      };
    });
    
    function jumpToNextProject() {
      if (vm.masterList().next > -1) {
         projectListService.jumpToProject(vm.masterList().next);
      }
    };

    function jumpToPreviousProject () {
      if (vm.masterList().previous > -1) {
         projectListService.jumpToProject(vm.masterList().previous);
      }
    };
  }

  
}());

(function() {
  
  angular
    .module("app.login", [
      "ui.bootstrap",
      "angular-storage",
      "angular-jwt"
    ]);
  
}());
(function() {
  
  "use strict";
  
  angular
    .module("app.login")
    .factory("loginApiService", loginApiService);
  
  loginApiService.$inject = ['$http'];
  
  function loginApiService($http) {
    var service = {login: login};

    return service;    
  
    function login(username, password) {
      return $http({
        url: "/auth",
        method: "POST",
        data: {"username": username, 
               "password": password}
      });
    };
  };
  
}());
(function() {
  
  "use strict";
  
  angular
    .module("app.login")
    .config(loginConfig);
  
  loginConfig.$inject = ['jwtInterceptorProvider', '$httpProvider'];
  
  function loginConfig(jwtInterceptorProvider, $httpProvider) {

    jwtInterceptorProvider.tokenGetter = function(store) {
      return store.get('jwt');
    };

    $httpProvider.interceptors.push('jwtInterceptor');

    $httpProvider.interceptors.push('loginInjector');
  }
    
}());
(function() {
  
  "use strict";
  
  angular
    .module("app.login")
    .controller("Login", Login);
  
  Login.$inject = ['$scope', 'loginApiService'];
  
  function Login($scope, loginApiService) {
    var vm = this;
    
    this.cancel = $scope.$dismiss;
    this.submit = submitLogin;
    
    function submitLogin(email, password) {
      loginApiService.login(email, password).then(function (user) {
        $scope.$close(user);
      });
    }
  };
  
}());
(function() {
  
  "use strict";
  
  angular
    .module("app.login")
    .run(loginRun);
  
  loginRun.$inject = ['$rootScope', '$state', 'store', 'jwtHelper', 'loginService'];
  
  function loginRun($rootScope, $state, store, jwtHelper, loginService) {
    $state.transitionTo("select");

    if (store.get("jwt") && !jwtHelper.isTokenExpired(store.get("jwt"))) {
      $rootScope.currentUser = jwtHelper.decodeToken(store.get("jwt"));
    }

    $rootScope.$on("$stateChangeStart", loginIfRequiredByToState);

    function loginIfRequiredByToState(e, toState, toParams, fromState, fromParams) {
      var requiresLogin = toState.data && toState.data.requiresLogin;
      var noActiveToken = !store.get("jwt") || jwtHelper.isTokenExpired(store.get("jwt"));
      if (requiresLogin && noActiveToken) {
        e.preventDefault();

        loginService()
          .then(
            function () {
              return $state.go(toState.name, toParams);
            },
            function () {
              if (fromState.name == "") {
                return $state.go("select.home");
              }
            }
          );
      }
    };
  };
  
}());
(function() {
  
  "use strict";
  
  angular
    .module("app.login")
    .service("loginService", loginService);
  
  loginService.$inject = ['$modal', '$rootScope', 'store', 'jwtHelper'];
  
  function loginService($modal, $rootScope, store, jwtHelper) {

    return getUserViaModal;
    
    function getUserViaModal() {
      var instance = $modal.open({
        templateUrl: "static/login/login.html",
        controller: "Login",
        controllerAs: "login"
      });

      return instance.result.then(assignCurrentUser);
    };

    function assignCurrentUser(response) {
      if (response.status == 200) {
        store.set("jwt", response.data.token);
        var user = jwtHelper.decodeToken(response.data.token);
        $rootScope.currentUser = user;
        return user;
      }
      return response;
    };
  };
  
}());
(function() {
  
  /**
   *  @name loginStateService
   *  @desc A factory for a service that provides information about the user's
   *        login status and roles.
   */

  "use strict";
  
  angular
    .module("app.login")
    .factory("loginStateService", loginStateService);
  
  loginStateService.$inject = ['$rootScope', '$http', 'store', 'jwtHelper', 'loginService'];
  
  function loginStateService($rootScope, $http, store, jwtHelper, loginService) {
    var service = {
      can_edit_roles: ["Curator", "Manager"],
      can_add_project_roles: ["Curator"],
      canAddComments: canAddComments,
      canAddProjects: canAddProjects,
      canEditProjects: canEditProjects,
      hasRole: hasRole,
      loggedIn: loggedIn,
      login: login,
      logout: logout,
      SaveState: SaveState,
      RestoreState: RestoreState
    };
    
    return service;    
    
    function canAddComments() {
      if (service.loggedIn()) {
        return true;
      }
      return false;
    }

    function canAddProjects() {
      if (service.loggedIn()) {
        if (_.intersection($rootScope.currentUser.roles, service.can_add_project_roles)) {
          return true;
        }
      }
      return false;
    }

    function canEditProjects() {
      if (service.loggedIn()) {
        if (_.intersection($rootScope.currentUser.roles, service.can_edit_roles)) {
          return true;
        }
      }
      return false;
    }

    function hasRole(role) {
      if (service.loggedIn()) {
        if (_.contains($rootScope.currentUser.roles, role)) {
          return true;
        }
      }
      return false;
    }

    function loggedIn() {
      return Boolean(store.get('jwt'));
    }
    
    function login() {
      loginService();
    }

    function logout() {
      store.remove('jwt');
      delete $rootScope.currentUser;
    }

    function SaveState() {
      sessionStorage.loginStateService = angular.toJson(service.masterList);
    }
    
    function RestoreState() {
      service.masterList = angular.fromJson(sessionStorage.loginStateService);
    }
    
    $rootScope.$on("savestate, service.SaveState");
    $rootScope.$on("restorestate, service.RestoreState");
  };
   
}());
(function() {

    angular
        .module("app.loginInjectorProvider", []);
        
}());
(function() {

  "use strict";

  angular
    .module("app.loginInjectorProvider")
    .factory("loginInjector", LoginInjector);

  LoginInjector.$inject = ['$q', '$injector', '$timeout'];

  function LoginInjector($q, $injector, $timeout) {
    var loginService, $http, $state;

    /* Avoid `Uncaught Error: [$injector:cdep] Circular dependency found` */
    /* http://brewhouse.io/blog/2014/12/09/authentication-made-simple-in-single-page-angularjs-applications.html 
    $timeout(function () { 
      loginService = $injector.get("loginService");
      $http = $injector.get("$http");
      $state = $injector.get("$state");
    }); */

    var service = {
      responseError: responseError
    };

    return service;

    function responseError(rejection) {
      if (rejection.status !== 401) {
        return rejection;
      }

      var deferred = $q.defer();

      loginService()
        .then(
          function () {
            deferred.resolve( $http(rejection.config) );
          },
          function () {
            $state.go("select.home");
            deferred.reject(rejection);
          }
        );

      return deferred.promise;
    };
  }
        
}());
(function() {
  
  angular
    .module("app.manage", ["ui.router"]);
  
}());

(function() {
  
  "use strict";
  
  angular
    .module("app.manage")
    .config(manageConfig);
  
  manageConfig.$inject = ['$stateProvider'];
  
  function manageConfig($stateProvider) {
    $stateProvider
      .state("manage", {
        url: "/manage",
        templateUrl: "/static/manage/manage.html",
        controller: "Manage",
        controllerAs: "manage",
        data: {
          requiresLogin: true
        }
      });
  };
  
}());
(function() {
  
  "use strict";
  
  angular
    .module("app.manage")
    .controller("Manage", Manage);
  
  Manage.$inject = ['$rootScope'];
  
  function Manage($rootScope) {
    
    this.currentUser = $rootScope.currentUser;
    
  };
  
}());
(function() {
  
  angular
    .module("app.modalConfirm", ["ui.bootstrap"]);
    
}());

(function() {
  // http://weblogs.asp.net/dwahlin/building-an-angularjs-modal-service
  
  "use strict";
  
  angular
    .module("app.modalConfirm")
    .factory("modalConfirmService", ModalConfirmService);
  
  ModalConfirmService.$inject = ['$modal'];
  
  function ModalConfirmService($modal) {
    var service = {
      modalDefaults: {
        backdrop: true,
        keyboard: true,
        modalFade: true,
        templateUrl: "/static/modalConfirm/confirm.html"
      },
      modalOptions: {
        actionText: "OK",
        bodyText: "OK to proceed?",
        closeText: "Close",
        headerText: "Confirm"
      },
      show: show,
      showModal: showModal
    };
    
    return service;
    
    function show(customDefaults, customOptions) {
      var currentDefaults = {};
      var currentOptions = {};
      
      jQuery.extend(currentDefaults, service.modalDefaults, customDefaults);
      jQuery.extend(currentOptions, service.modalOptions, customOptions);
      
      if (!currentDefaults.controller) {
        currentDefaults.controller = ["$scope", "$modalInstance",
          function($scope, $modalInstance) {
            $scope.modalOptions = currentOptions;
            $scope.modalOptions.ok = function(result) {
              $modalInstance.close(result);
            };
            $scope.modalOptions.close = function(result) {
              $modalInstance.dismiss("cancel");
            };
          }
        ];
      }
      
      return $modal.open(currentDefaults).result;
    };

    function showModal(customDefaults, customOptions) {
      if (!customDefaults) customDefaults = {};
      customDefaults.backdrop = "static";
      return service.show(customDefaults, customOptions);
    };
  }
    
}());

(function() {
  
  /**
   *  @module app.project
   *  @desc   A module for handling the Project tab states of the application
   */
  
  angular
    .module("app.project", [
        "ui.date", 
        "ui.router"
      ]);
  
}());

(function() {
  
  /**
   *  @name reportConfig
   *  @desc Configuration for app.project module
   */
  
  "use strict";
  
  angular
    .module("app.project")
    .config(projectConfig);
  
  projectConfig.$inject = ['$stateProvider'];

  function projectConfig($stateProvider) {
    $stateProvider
      .state('project', {
        /** virtual root state for Project tab view */
        url: '/project',
        controller: "Project",
        controllerAs: "project",
        templateUrl:"/static/project/project.html",
        data: {
          requiresLogin: false,
          viewUrl: "/static/project/project.html"
        }
      }) 
      .state("project.add",  {
        /** state for adding a project */
        url: "/add",
        templateUrl: "/static/project/templates/description.html",
        data: {
          requiresLogin: true
        }
      })
      .state('project.attach', {
        /** virtual root for project.attach views */
        url: '/attach',
        data: {
          requiresLogin: true
        }
      })
      .state("project.attach.edit", {
        /** state for attaching a file under the Attach sub-tab */
        url: "/edit/:projectID",
        controller: ['$stateParams', function ($stateParams) {
          console.log($stateParams);
        }],
        controllerAs: "project",
        data: {
          requiresLogin: true
        }
      })
      .state('project.comment', {
        /** virtual root for project.comment views */
        url: '/comment',
        templateUrl: "/static/project/templates/comment.html",
        data: {
          requiresLogin: true
        },
        resolve: {
          projectID: ['$stateParams', function($stateParams) {
            return $stateParams.projectID;
          }]
        }
      })
      .state("project.comment.add", {
        /** state for adding a comment to specified project */
        url: "/add/:projectID",
        controller: ['$stateParams', function ($stateParams) {
          console.log($stateParams, projectID);
        }],
        onEnter: ['attributesService', 'projectListService', function(attributesService, projectListService) {
            if (!attributesService.getAllAttributes()) {
              /** then the list of attributes is empty. Get it */
              attributesService.updateAllAttributes()
                .then(function() {
                  attributesService.updateProjAttrsFromRawItem('comment', 
                    [{name: 'commentID', value: {id: 0}}]);
                });
            } else {
              attributesService.updateProjAttrsFromRawItem('comment', 
                [{name: 'commentID', value: {id: 0}}]);
            }
          }
        ]
      })
      .state("project.comment.edit", {
        /** state for the project editing Comment sub-tab */
        url: "/edit/:projectID",
        resolve: {
          projectID: ['$stateParams', function($stateParams) {
            return $stateParams.projectID;
          }]
        },
        controller: ['$stateParams', function ($stateParams) {
          console.log($stateParams);
        }]
      })
      .state("project.comment.edit.detail", {
        /** state for editing the specified comment */
        url: "/detail/:commentID",
        controller: ['$stateParams', 'projectID', function ($stateParams, projectID) {
          $stateParams.projectID = projectID;
          console.log($stateParams, projectID);
        }]
      })
      .state("project.description", {
        /** virtual root for project.description views */
        url: "/description",
        templateUrl: "/static/project/templates/description.html",
        data: {
          requiresLogin: true
        }
      })
      .state("project.description.edit", {
        /** state for project editing Description sub-tab */
        url: "/edit/:projectID",
        controller: ['$stateParams', function ($stateParams) {
          console.log($stateParams);
        }],
        data: {
          requiresLogin: true
        }
      })
      .state('project.detail', {
        /** state for project display view */
        url: '/:projectID',
        controller: ['$stateParams', function ($stateParams) {
          console.log($stateParams);
        }],
        templateUrl: "/static/project/templates/detail.html",
        data: {
          requiresLogin: false
        }
      })
      .state("project.disposition", {
        /** virtual root for project.disposition views */
        url: "/disposition",
        templateUrl: "/static/project/templates/disposition.html",
        data: {
          requiresLogin: true
        }
      })
      .state("project.disposition.add", {
        /** state for adding a disposition to the specified project */
        url: "/add/:projectID",
        controller: ['$stateParams', function($stateParams) {
          console.log($stateParams);
        }],
        onEnter: ['attributesService', function(attributesService) {
            if (!attributesService.getAllAttributes()) {
              /** then the list of project brief descriptions is empty. Get it */
              attributesService.updateAllAttributes()
                .then(function() {
                  attributesService.updateProjAttrsFromRawItem('disposition', 
                    [{name: 'disposedInFY', value: {id: 0}}, 
                     {name: 'disposedInQ', value: {id: 0}}]);
                });
            } else {
              attributesService.updateProjAttrsFromRawItem('disposition', 
                [{name: 'disposedInFY', value: {id: 0}}, 
                 {name: 'disposedInQ', value: {id: 0}}]);
            }
          }
        ]

      })
      .state("project.disposition.edit", {
        /** state for project editing Disposition tab */
        url: "/edit/:projectID",
        resolve: {
          projectID: ['$stateParams', function($stateParams) {
            return $stateParams.projectID;
          }]
        },
        controller: ['$stateParams', function ($stateParams) {
          console.log($stateParams);
        }]
      })
      .state("project.disposition.edit.detail", {
        /** state for editing the specified disposition, where the primary key
            consists of the year and quarter of the disposition */
        url: "/detail/:disposedInFY/:disposedInQ",
        controller: ['$stateParams', 'projectID', function ($stateParams, projectID) {
          console.log($stateParams);
        }]
      })
      .state("project.portfolio", {
        /** virtual root for the project.portfolio views */
        url: "/portfolio",
        templateUrl: "/static/project/templates/portfolio.html",
        data: {
          requiresLogin: true
        }
      })
      .state("project.portfolio.edit", {
        /** state for project editing under the Portfolio sub-tab */
        url: "/edit/:projectID",
        controller: ['$stateParams', function ($stateParams) {
          console.log($stateParams);
        }]
      })
      .state("project.projectMan", {
        /** virtual root for the project.projectMan views */
        url: "/projectMan",
        templateUrl: "/static/project/templates/projectMan.html",
        data: {
          requiresLogin: true
        }
      })
      .state("project.projectMan.edit", {
        /** state for project editing under the Project Management sub-tab */
        url: "/edit/:projectID",
        controller: ['$stateParams', function ($stateParams) {
          console.log($stateParams);
        }]
      });
  };

}());

(function() {
  
  /**
   *  @name Project
   *  @desc A controller for the states and views associated with the Project 
   *        tab. 
   */
  
  "use strict";
  
  angular
    .module("app.project")
    .controller("Project", Project);
  
  Project.$inject = ['$scope', '$state', 'projectDataService', 'projectListService', 'attributesService', 'modalConfirmService', 'loginStateService'];
  
  function Project($scope, $state, projectDataService, projectListService, 
                   attributesService, modalConfirmService, loginStateService){
    
    this.as = attributesService;
    this.ds = projectDataService;
    this.ls = projectListService;
    this.log_s = loginStateService;
    
    this.attributes = attributesService.getAttributes;
    this.changeMode = projectDataService.changeMode;
    this.currentMode = projectDataService.currentMode;
    this.dateOptions = {changeYear: true, changeMonth: true};
    this.error = this.ds.server;
    this.jumpToAtachFile = projectDataService.jumpToAtachFile;
    this.jumpToAddForm = projectDataService.jumpToAddForm;
    this.masterList = this.ls.getMasterList;
    this.success = this.ds.success;
    this.viewUrl = projectDataService.viewUrl;

    $scope.$on("setProjectFormPristine", function() {
      $scope.projectForm.$setPristine(true);
    });
    
    $scope.$on(["$stateChangeStart"], unsavedDataPopup);
    
    /**
     *  @name unsavedDataPopup
     *  @desc Open a popup and ask how to proceed in the case of attempting to 
     *        navigate away from one of the project edit sub-tabs when there 
     *        is unsaved data in the form. The  function is bound to the 
     *        $stateChangeStart event, and the calling sequence is that of a 
     *        handler for this event.
     *  @param {Object} event
     *  @param {Object} toState
     *  @param {Object} toParams
     *  @param {Object} fromState
     *  @param {Object} fromParams
     */
    function unsavedDataPopup(event, toState, toParams, fromState, fromParams) {
      projectDataService.success = "";
      if (typeof projectDataService.noCheck != "undefined") {
        $scope.projectForm.$setPristine(true);
        delete projectDataService.noCheck;
        //projectDataService.getProjectData(projectDataService.projectID); // forced discard
        //$state.go(toState, toParams);
      }
      
      /** if the "projectForm" project editing form has unsaved changes ... */
      if ($scope.projectForm.$dirty) {
        event.preventDefault();

        var modalOptions = {
            closeText: "Cancel",
            actionText: "Continue",
            headerText: "Unsaved changes",
            bodyText: "You have unsaved changes. Press Continue to discard your changes and" 
                      + " navigate away, or press Cancel to stay on this page."
        };

        /** Open a modal window that asks the question shown above as bodyText,
         *  and shows Continue and Cancel buttons for making a response. The
         *  promised response is passed to a callback function.
         */
        modalConfirmService.showModal({}, modalOptions).then(function (response) {
          $scope.projectForm.$setPristine(true);
          var target = toParams.projectID ? toParams.projectID : fromParams.projectID;
          projectDataService.getProjectData(target, toParams); // forced discard
          $state.go(toState, toParams);
        });
      }
    }
    
    /**
     *  @name unsavedChangesConfirmed
     *  @desc Callback to handle the user's choice to discard unsaved changes
     *        and navigate away with saving.The form is set back to the pristine
     *        state, form data is returned to the last saved state, and a state
     *        change for navigating away is started.
     *  @param {Object} response 
     */
    function unsavedChangesConfirmed(response) {
      $scope.projectForm.$setPristine(true);
      var target = toParams.projectID ? toParams.projectID : fromParams.projectID;
      projectDataService.getProjectData(target, toParams); // forced discard
      $state.go(toState, toParams);
    }
  };
  
}());

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
  
  projectDataService.$inject = ['$rootScope', '$http', '$state', '$stateParams', '$q', '$location', '$timeout', 'attributesService', 'loginStateService', 'projectListService', 'stateLocationService'];
  
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
      service.getProjectData(service.restoredParams);
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
        else {
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
      $http.get("getProjectAttributes/0")
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
	 * @returns {Object} - a promise that is resolved once the response 
     *        from the back end has been saved.
     */
    function getProjectData(params) {
      var deferred = $q.defer();
      if (parseInt(params.projectID) > -1) {
        $http.get("getProjectAttributes/" + params.projectID)
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
        service.getProjectData($stateParams);
      }
      else if (saved_projectID && saved_projectID == state_projectID
               &&  typeof service.getProjectAttributes('description') == "undefined") {
        /** we should be good to go but there are no saved data, 
         *  so ... */
        $timeout(function() {
          service.getProjectData($stateParams)
            .then(deferred.resolve());
        });
      }
      else if (saved_projectID && saved_projectID == state_projectID &&
               (typeof attributesService.getAttribute("name") == "undefined"
                || attributesService.getAttribute("name").value == "")) {
        /** data were wiped out. Perhaps just came from the Add project tab, 
            so ... */
        $timeout(function() {
          service.getProjectData($stateParams)
            .then(deferred.resolve());
        });
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
        service.restoredParams = angular.fromJson(sessionStorage.projectDataServiceAttributes);
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
      var formData = attributesService.getFormData(tableName, keys);
      var csrf_token = formData.csrf_token;
      //delete formData.csrf_token;
      formData.lastModifiedBy = $rootScope.currentUser.id;
      var projectID = $state.params.projectID ? $state.params.projectID : "";
      var request = {
        method: "POST",
        url: "/projectEdit/" + $state.params.projectID + "/" + tableName,
        headers: {
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
          //"Content-Type": "application/json; charset=UTF-8",
          "X-CSRFToken": csrf_token
        },
        data: jQuery.param(formData, true)
        //data: formData // jQuery.param(formData, true)
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
      var params = stateLocationService.getStateFromLocation().params;
      sessionStorage.projectDataServiceAttributes = angular.toJson(params);
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
      projectListService.setProjectID(result.data.projectID);
      attributesService.updateProjectAttributes(result, params);
      service.success = result.data.success;
      service.error = attributesService.server_error;
      service.SaveState();
      attributesService.SaveState();
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

(function() {
  
  /**
   *  @name projectListService
   *  @desc A factory for the service that maintains a list of project short
   *        descriptions. Each description consists of the values for project
   *        attributes projectID, name, description, and finalID.
   *
   *  The projectListService has a number of uses:
   *
   *    project navigation
   *      The service keeps track of the last project you looked at, and if you
   *      navigate away from the Project tab and come back you will see the 
   *      same project, without going back to the server again. So there is
   *      the concept of a "current project." At the start of the session the
   *      current project will be the one with the lowest projectID.
   *
   *      The (ordered) list of projects allows for stepping through the list
   *      and the concept of previous and next projects. At the start of a 
   *      session the next project will be the one with the second lowest
   *      projectID, and there will not be a previous project. This functionality
   *      is revealed by the Previous and Next tabs, and their appearance 
   *      changes according to whether there are prevous and next projects.
   *
   *    project selection
   *      Other services provide the ability for you to select a subset of all
   *      available projects. This service holds a list of selected projectIDs
   *      along with a human-readable description of the selection criteria
   *      and a http GET query string that records the actual metadata values.
   *
   *      This service allows other services to show you a report of all 
   *      selected services, work on selected projects one at a time, and to
   *      navigate through selected projects using the Previous and Next tabs,
   *      which will skip over projects not selected.
   *
   *      The Select tab functionality for selecting a project from a dropdown
   *      menu is built on the short description data. The search functionality
   *      there uses a filter on the same data. Final state is one of the
   *      attributes sent out from the backend just for this purpose.
   *
   *      The Filter Builder and Report tabs use the descriptions of the project
   *      selection criteria for restoring state, providing a basis for 
   *      modifying the criteria.
   */

  "use strict";
  
  angular
    .module("app.project")
    .factory("projectListService", ProjectListService);
    
  ProjectListService.$inject = ['$rootScope', '$http', '$state', '$stateParams', '$location', '$q'];
  
  function ProjectListService($rootScope, $http, $state, $stateParams, 
                              $location, $q) {

    /** service to be returned by this factory */
    var service = {
      allProjectsCount: allProjectsCount,
      getIDListFromAllProjects: getIDListFromAllProjects,
      getMasterList: getMasterList,
      getNextID: getNextID,
      getPreviousID: getPreviousID,
      getProjectID: getProjectID,
      getSelectedIds: getSelectedIds,
      getSelectedProjects: getSelectedProjects,
      getSql: getSql,
      hasNextID: hasNextID,
      hasPreviousID: hasPreviousID,
      hasProjects: hasProjects,
      initModel: initModel,
      jumpToProject: jumpToProject,
      jumpToProjectInList: jumpToProjectInList,
      resetList: resetList,
      RestoreState: RestoreState,
      SaveState: SaveState,
      selectedIdsCount: selectedIdsCount,
      setAllProjectResults: setAllProjectResults,
      setDescription: setDescription,
      setList: setList,
      setProjectID: setProjectID,
      setSql: setSql,
      updateAllProjects: updateAllProjects
    };
  
    service.RestoreState();
    if (typeof(service.masterList) == "undefined") {
      service.initModel();
    } 

    $rootScope.$on("savestate", service.SaveState);
    $rootScope.$on("restorestate", service.RestoreState);
    
    return service;    

    /**
     *  @name allProjectsCount
     *  @desc Return the total number of available projects
     *  @returns {Number}
     */
    function allProjectsCount() {
      return service.getMasterList().allProjects.length;
    }

    /**
     *  @name getIDListFromAllProjects
     *  @desc Return the list of projectIDs for all available projects
     *  @returns {Number[]}
     */
    function getIDListFromAllProjects() {
      return _.map(service.masterList.allProjects, function(item) {
        return item.projectID;});
    };

    /**
     *  @name getMasterList
     *  @desc Getter for service.masterList
     *  @returns {Object}
     */
    function getMasterList() {
      return service.masterList;
    };

    /**
     *  @name getNextID
     *  @desc Getter for service.masterList.next
     *  @returns {Number} projectID
     */
    function getNextID() {
      return service.masterList.next;
    }

    /**
     *  @name getPreviousID
     *  @desc Getter for service.masterList.previous
     *  @returns {Number} projectID
     */
    function getPreviousID() {
      return service.masterList.previous;
    }

    /**
     *  @name getProjectID
     *  @desc Getter for service.masterList.projectID
     *  @returns {Number}
     */
    function getProjectID() {
      return service.masterList.projectID;
    }
    
    /**
     *  @name getSelectedIds
     *  @desc Getter for service.masterList.selectedIds
     *  @returns {Number[]}
     */
    function getSelectedIds() {
      return service.masterList.selectedIds;
    }

    /**
     *  @name getSelectedProjects
     *  @desc Return the brief descriptions for all of the selected projects
     *  @returns {Object[]}
     */
    function getSelectedProjects() {
      return service.masterList.selectedProjects;
    }

    /**
     *  @name getSql
     *  @desc Getter for service.masterList.sql
     *  @returns {string}
     */
    function getSql() {
      return service.masterList.sql;
    }
    
    
    function hasNextID() {
      return service.masterList.next != -1;
    }

    function hasPreviousID() {
      return service.masterList.previous != -1;
    }

    /**
     *  @name hasProjects
     *  @desc Return the validity of the statement "there are available 
     *        projects in service.masterList.allProjects"
     *  @returns {Boolean}
     */
    function hasProjects() {
      return Boolean(service.allProjectsCount() > 0);
    }
    
    /**
     *  @name initModel
     *  @desc Initialize the masterList object to make it ready for receiving
     *        data. The masterList holds the service state data, which gets
     *        saved as JSON to local storage when updated and restored when
     *        necessary.
     */
    function initModel() {
      service.masterList = {
        allProjects: [],
        description: "none",
        index: -1,
        next: -1,
        previous: -1,
        projectID: -1,
        projectName: "",
        selectedIds: [],
        selectedProjects: [],
        sql: ""
      };
    };

    /**
     *  @name jumpToProject
     *  @desc Go to the project.detail state for the given projectID. There
     *        must be a project to match the given projectID. Otherwise an 
     *        is raised.
     *  @param {Number|string} projectID - project identifier
     */
    function jumpToProject(projectID) {
      projectID = parseInt(projectID);
      var index = service.masterList.selectedIds.indexOf(projectID);
      /** if in selectedIds, make it the current project */
      if (service.masterList.selectedIds.indexOf(projectID) > -1) {
        service.jumpToProjectInList(projectID, service.masterList.selectedIds);
        return;
      }
      /** otherwise just go, if it exists */
      var projectIDlist = service.getIDListFromAllProjects();
      if (projectIDlist.indexOf(projectID) > -1) {
        service.jumpToProjectInList(projectID, projectIDlist);
        return;
      }
      alert("Can't find a project to display.");
    };
    
    
    /**
     *  @name jumpToProjectInList
     *  @desc Go to the project.detail state for the specified project and make
     *        it the current project
     */
    function jumpToProjectInList(projectID) {
      service.setProjectID(projectID);
      $state.go('project.detail', {projectID: projectID});
    };

    /**
     *  @name resetList
     *  @desc Reset the project list to the state where all projects are selected
     *        without forgetting which is the current project.
     */
    function resetList() {
      service.updateAllProjects(service.getProjectID())
        .then(function(projectID) {
          service.setDescription("none");
          service.setSql("");
          service.masterList.selectedProjects = service.masterList.allProjects;
          service.masterList.selectedIds = _.map(service.masterList.allProjects, function(project) {
            return project.projectID;
          });
        });
    }

    /**
     *  @name RestoreState
     *  @desc Restore the service.masterList object from client session storage
     */
    function RestoreState() {
      if (typeof sessionStorage.projectListService != "undefined") {
        service.masterList = angular.fromJson(sessionStorage.projectListService);
      }
    };

    /**
     *  @name SaveState
     *  @desc Save the service.masterList object in client session storage
     */
    function SaveState() {
        sessionStorage.projectListService = angular.toJson(service.masterList);
    };

    /**
     *  @name selectedIdsCount
     *  @desc Return the number of selected projects
     */
    function selectedIdsCount() {
      return service.masterList.selectedIds.length;
    }
    
    /**
     *  @name setAllProjectResults
     *  @desc Callback to save the response to a backend request for a complete
     *        list of project short descriptions sent by updateAllProjects().
     *  @param {Object} response - JSON response containing a list of project
     *        brief descriptions.
     *  @param {Number} [projectID=service.masterList.selectIds[0] || -1] - the 
     *        projectID to be configured as the current project.
     *
     *  The idea is that the list of available projects be loaded at the start 
     *  of a session an then re-used. But you, or some other user, might have
     *  added a new project that you want to work on. So you need to be able to
     *  update the list with out disrupting your workflow, which means not 
     *  changing the list of selected projects or the current project.
     */
    function setAllProjectResults(response, projectID) {
      service.masterList.allProjects = response.data.descriptions;
      if (typeof projectID == "undefined" || projectID < 0) {
        if (typeof service.masterList.selectIds != "undefined" && 
            service.masterList.selectIds.length) {
          projectID = service.masterList.selectIds[0];
          setProjectID(projectID);
        }
        else {
          var selectedIds = service.getIDListFromAllProjects();
          setProjectID(selectedIds[0], selectedIds);
        }
      }
    };
    
    /**
     *  @name setDescription
     *  @desc Setter for service.masterList.description
     *  @param {string} description - human readable description of the query
     *        used to select the current list of projects that is stored in 
     *        service.master.selectedIds
     */
    function setDescription(description) {
      service.masterList.description = description;
    };
    
    /**
     *  @name setList
     *  @desc Setter for service.masterList.selectedIds
     *  @param {Number[]} selectIds - a list of projectIDs to be saved as the
     *        list of selected projects.
     */
    function setList(selectedIds) {
      service.masterList.selectedIds = selectedIds;
      if (typeof selectedIds == "undefined") {
        var what_the_;
      }

      var index = selectedIds.indexOf(service.masterList.projectID);
      if (index < 0) {
        var projectID = selectedIds[0];
        service.setProjectID(projectID, selectedIds);
      }
      
      service.masterList.selectedProjects = _.filter(service.masterList.allProjects, function(project) {
        return _.contains(service.masterList.selectedIds, project.projectID);
      });
    }

    /**
     *  @name setProjectID
     *  @desc Setter for service.masterList.projectID and
     *        service.masterList.selectedIds
     *  @param {Number} projectID - the projectID to be configured as the 
     *        current project.
     *  @param {Number[]} [selectedIds=service.masterList.selectedIds] - a list 
     *        of projectIDs to be saved as the list of selected projects.
     */
    function setProjectID(projectID, selectedIds) {
      if (projectID) {
        projectID = parseInt(projectID);
        service.masterList.projectID = projectID;

        /** do we recognize this project? */
        var index = service.masterList.selectedIds.indexOf(projectID);
        if (projectID > 0 && index == -1) {

          /** then maybe this projectID is a mistake, but maybe we just added a 
           *  new project. Better check. */
          service.updateAllProjects(projectID)
            .then(function(projectID) {
              if (typeof selectedIds != "undefined") {
                service.masterList.selectedIds = selectedIds;
              }
              index = service.masterList.selectedIds.indexOf(projectID);
            }); 
        }

        if (index > -1) {
          service.masterList.index = index;
          if (index > 0) {
            service.masterList.previous = service.masterList.selectedIds[index-1];
          } 
          else {
            service.masterList.previous = -1;
          }
          if (index < service.masterList.selectedIds.length) {
            service.masterList.next = service.masterList.selectedIds[index+1];
          }
          else {
            service.masterList.next = -1;
          }
        }
        _.each(service.masterList.allProjects, function(proj){
          if (proj.projectID == projectID) {
            service.masterList.projectName = proj.name;
          }
        });
        
        service.masterList.selectedProjects = _.filter(service.masterList.allProjects, function(project) {
          return _.contains(service.masterList.selectedIds, project.projectID);
        });

      }
      service.SaveState();
    };

    /**
     *  @name setSql
     *  @desc Setter for service.masterList.sql
     *  @param {string} query_string - an http GET query_string to represent
     *        the actual SQL used to filter from all projects down to the
     *        selected projects.
     */
    function setSql(query_string) {
      service.masterList.sql = query_string;
    }
      
    /**
     *  @name updateAllProjects
     *  @desc Obtain the complete list of project brief descriptions from the
     *        back end and promise sending them to the setAllProjectResults
     *        callback function. Each brief description contains values for
     *        project attributes projectID, name, description, and finalID.
     *  @param {Number} [projectID] - projectID passed to the callback, which
     *        needs to be aware that it might be absent.
     */
    function updateAllProjects(projectID) {
      var deferred = $q.defer();
      $http.post('/getBriefDescriptions')
        .then(function(response) {
          service.setAllProjectResults(response, projectID);
          deferred.resolve(projectID);
        });
      return deferred.promise;
    };
    
  }
    
}());

(function() {
  
  /**
   *  @name projectSubHeadings
   *  @desc Render project-specific subheading items
   */
  
  angular
    .module("app.project")
    .directive("projectSubHeadings", ProjectSubHeadings);
  
  function ProjectSubHeadings() {
    return {
      restrict: "EA",
      templateUrl: "/static/project/templates/subHeadings.html",
    };
  }
  
}());

(function() {

  /**
   *  @module app.report
   *  @desc   a module for the Report tab of the application
   */  

  angular
    .module("app.report", [
        "ui.router",            /** angular-ui-router */
        "datatables",           /** angular-datatables, depends on jQuery DataTables */
        "datatables.bootstrap"  /** angular-datatables Bootstrap module */
      ]);
  
}());

(function() {
  
  /**
   *  @name reportConfig
   *  @desc Configuration for app.report module
   */
  
  "use strict";
  
  angular
    .module("app.report")
    .config(reportConfig);
   
  reportConfig.$inject = ['$stateProvider'];
  
  function reportConfig($stateProvider) {
    $stateProvider
      .state("report", {
        /** virtual root state */
        url: "/report",
        controller: "Report",
        controllerAs: "report",
        templateUrl: "/static/report/report.html",
        data: {
          requiresLogin: false
        }
      })
      .state("report.columns", {
        /** state for the Select Other Columns view */
        url: "/columns/:query_string",
        templateUrl: "/static/report/templates/columns.html",
        controller: ['$stateParams', function ($stateParams) {
          console.log($stateParams);
        }]
      })
      .state("report.table", {
        /** state for the View Project List as Table view */
        url: "/:query_string",
        templateUrl: "/static/report/templates/table.html",
        controller: ['$stateParams', function ($stateParams) {
          console.log($stateParams);
        }]
      });
  }
  
}());

(function() {
  
  /**
   *  @name Report
   *  @desc A controller for the states and views associated with the Report tab
   */
  
  "use strict";
  
  angular
    .module("app.report")
    .controller("Report", Report);
  
  Report.$inject = ['$state', '$stateParams', 'projectListService', 'reportTableService'];
  
  function Report($state, $stateParams, projectListService, reportTableService) {
    
    this.ls = projectListService;
    this.masterList = this.ls.getMasterList;
    this.jumpToProject = this.ls.jumpToProject;

    this.ts = reportTableService;
    this.state = $state;

  }
  
}());

(function() {

  /**
   *  @name reportTableService
   *  @desc A factory for the service that manages the data associated with the
   *        projects DataTable under the Report tab. The service retrieves and
   *        stores the data shown in the table as well as the options and column
   *        definitions for the table. Key data in the "master" service
   *        attribute are saved after being updated and restored from client
   *        session storage when the factory is re-instantiated.
   */

  "use strict";
  
  angular
    .module('app.report')
    .factory('reportTableService', ReportTableService);
    
  ReportTableService.$inject = ['$compile', '$http', '$location', '$rootScope', '$state', '$stateParams', 'DTColumnBuilder', 'DTInstances', 'DTOptionsBuilder', 'projectListService', 'stateLocationService'];
  
  function ReportTableService($compile, $http, $location, $rootScope, $state, 
                               $stateParams, DTColumnBuilder, DTInstances, 
                               DTOptionsBuilder, projectListService,
                               stateLocationService) {

    /** service to be returned by factory */
    var service = {
      createdRow: createdRow,
      dataTableRowCount: dataTableRowCount,
      getReportResults: getReportResults,
      getReportTableData: getReportTableData,
      initService: initService,
      projectIDColumn: {data: "projectID",
                        title: "ID",
                        render: jumpToProjectLink,
                        defaultContent: ""},
      RestoreState: RestoreState,
      SaveState: SaveState,
      scope: $rootScope.$new(), // http://stackoverflow.com/questions/17600905/compile-directives-via-service-in-angularjs#comment41413717_17601350
      setReportResults: setReportResults,
      setReportTableData: setReportTableData,
      tableColumns: tableColumns,
      title: "View Project List as Table",
      master: {
        dtColumns: [{data: "projectID",
                        title: "ID",
                        render: jumpToProjectLink,
                        defaultContent: ""},
                    {data: "name", title: "Name"},
                    {data: "abstract", title: "Abstract"},
                    {data: "maturity", title: "Maturity"},
                    {data: "drivers", title: "Drivers"},
                    {data: "disposition", title: "Disposition"},
                    {data: "flavor", title: "Portfolio catagory"},
                    {data: "startedOn", title: "Started"},
                    {data: "bogus", title:"Bogus"}],
        dtInstance: {},
        dtOptions: {        
          destroy: true,
          lengthChange: false,
          pageLength: 25,
          paging: false,
          pagingType: "full_numbers",
          saveState: true,
          searching: false,
          serverSide: false
        }
      },
    };
    
    service.RestoreState();
    
    $rootScope.$on("savestate", service.SaveState);
    $rootScope.$on("restorestate", service.RestoreState);
    $rootScope.$on("$locationChangeSuccess", function() {
      /** if we landed under the Report tab ... */
      if (_.first($state.current.name.split(".")) == "report") {

        if (!projectListService.hasProjects()) {
          /** then the list of project brief descriptions is empty. Get it */
          projectListService.updateAllProjects()
            .then(service.initService);
        }
        else {
          service.initService();
        }
      }
    });
      

    
    return service;

    /**
     *  @name createdRow
     *  @desc A jQuery/angular DataTable callback, called on a row after it is
     *        created. We use it to $compile it, to activate angular directives
     *        like sref-ui.
     *  @param {Object} row - a DataTable row object
     *  @param {Object} data - the data for the row columns, passed in via ajax
     *  @param {number} dataIndex - the DataTable row number
     */
    function createdRow(row, data, dataIndex) {
      $compile(angular.element(row).contents())(service.scope);
    }

    /**
     *  @name getReportResults
     *  @desc Send an http GET query string to the backend and retrieve 
     */
    function getReportResults(query_string) {
      var request = {
        method: "POST",
        url: "/getReportResults",
        data: {query_string: encodeURIComponent(query_string),
               tableColumns: service.tableColumns()}
      };
      $http(request)
        .then(service.setReportResults);
    }

    /**
     *  @name getReportTableData
     *  @desc Send an array of projectIDs to the backend and retrieve data for 
     *        populating the DataTable. It returns the same row data as 
     *        getReportResults, along with a list of projectIDs extracted from 
     *        the results, a rendering of the input query string used as the url 
     *        for the table, and a string to describe the query in human-readable 
     *        terms.
     *  @param {string} query_string - an http GET query string
     */
    function getReportTableData() {
      var request = {
        method: "POST",
        url: "/getReportTableJSON",
        data: {projectID: projectListService.getSelectedIds(),
               tableColumns: service.tableColumns()}
      };
      $http(request)
        .then(service.setReportTableData);
    }
    
    /**
     *  @name initService
     *  @desc called onEnter from reportConfig.js to ensure that data for the
     *        report from the backend are already in hand (or promised).
     */
    function initService() {

      /** query from location bar */
      var state_from_location = stateLocationService.getStateFromLocation();
      var location_query = state_from_location.params.query_string;

      /** query saved in the project list service */
      var saved_query = projectListService.getSql();

      if (typeof location_query == "undefined") {
        /** If the state derived from the location bar has no location_query
            parameter... This is the case using the Break Down functionality 
            on the Select tab, where the location indicates a Select tab state. */
        service.getReportResults(saved_query);
      }
      else if (location_query && location_query != saved_query) {
        /** If the location tells us what we need, and know we have something 
            else ... This is the bookmarked report case. */
        service.getReportResults(location_query);
      }
      else if (location_query == "" && service.dataTableRowCount() != projectListService.allProjectsCount()) {
        /** If the location tells us we really want everything and the data
            tell us we have something less ... */
        service.getReportResults(location_query);
      }
      else if (service.dataTableRowCount() == 0) {
        /** if we know what we want and it is what we have, but there are no 
            data for the table ... */
        service.getReportTableData();
      }
    }

    /**
     *  @name jumpToProjectLink
     *  @desc a jQuery/angular DataTable column rendering function, used to
     *        populate the projectID column with a link for changing state_query
     *        to view the project on this table row (after being compiled by
     *        function createdRow)
     *  @param {number} data - projectID value for this cell
     *  @param {string} type - DataTable flag for the type of rendering to do
     *  @param {Object} full = a data object with values for all columns in row
     *  @param {Object} meta = a data object with column and row indices for cell
     */
    function jumpToProjectLink( data, type, full, meta ) {
      return '<a ui-sref="project.detail({projectID: ' + data + '})">' + data + '</a>';
    }

    /**
     *  @name dataTableRowCount
     *  @desc return the number of data rows in the DataTable
     */
    function dataTableRowCount() {
      try {
        return service.master.dtOptions.data.length;
      }
      catch (e) {
        return 0;
      }
    }
    
    /**
     *  @name RestoreState
     *  @desc restore the service.master object from client session storage
     *        Special care is taken to restore the functions lost in JSON
     */
    function RestoreState() {
      if (typeof sessionStorage.reportTableService != "undefined") {
        var master = angular.fromJson(sessionStorage.reportTableService);

        // render function gets lost in conversion to JSON and needs to be replaced
        service.master.dtColumns = master.dtColumns;
        service.master.dtColumns[0] = service.projectIDColumn; 

        // createdRow option function gets lost in converstion to JSON
        service.master.dtOptions = master.dtOptions;
        service.master.dtOptions.createdRow = service.createdRow;
      }
    }
    
    /**
     *  @name SaveState
     *  @desc save the service.master object in client session storage
     *        Functions will be lost in the conversion to JSON.
     */
    function SaveState() {
      sessionStorage.reportTableService = angular.toJson(service.master);
    }

    function setReportResults(response) {
      projectListService.setList(response.data.response.projectList);
      projectListService.setDescription(response.data.response.query_desc);
      projectListService.setSql(response.data.response.query_string);
      projectListService.SaveState();
      setReportTableData(response);
      //service.master.dtInstance.rerender();
      service.SaveState();
    }

    function setReportTableData(response) {
      service.master.dtOptions = DTOptionsBuilder.newOptions().withBootstrap();

      /** initial data to be replaced when the promise is resolved */
      service.master.dtOptions.withOption("data", []); 

      _.each(Object.keys(response.data.response.options), function(key) {
         service.master.dtOptions.withOption(key, response.data.response.options[key]);
      });
      service.master.dtOptions.withOption("createdRow", createdRow);
      service.master.dtColumns = [service.projectIDColumn].concat(response.data.response.columns);
      service.master.dtOptions.data = response.data.response.data;
      //service.master.dtInstance.rerender();
      //var path = $location.path().split("/");
      //path.pop();
      //path.push(response.data.query_string)
      //$location.url(path.join("/"));
      service.SaveState();
    }

    /**
     *  @name tableColumns
     *  @desc Return a list of column names by extracting the "data" attribute
     *        from each item in the dtColumns list. 
     *  @returns {string[]} 
     */
    function tableColumns() {
      return _.pluck(service.master.dtColumns, "data");
    }
  }
      
}());
(function() {

  /**
   *  @name reportTableSubHeadings
   *  @desc Render report-specific subheadings from a template
   */

  "use strict";

  angular
    .module("app.report")
    .directive("reportTableSubHeadings", ReportTableSubHeadings);

  function ReportTableSubHeadings() {

    function controller() {
      var vm = this;
    }

    return {
      bindToController: true,
      controller: controller,
      controllerAs: "ctrl",
      link: function(scope, element, attributes, ctrl) {
        console.log("reportTableSubHeadings");
      },
      scope: {
        report: "="
      },
      templateUrl: "static/report/templates/subHeadings.html"
    };
  }

}());
(function() {
  
  angular
    .module("app.select", [
      "ui.router", 
      'readMore'
    ]);
  
}());

(function() {
  
  "use strict";
  
  angular
    .module("app.select")
    .config(selectConfig);
  
  selectConfig.$inject = ['$stateProvider'];
  
  function selectConfig($stateProvider) {
    $stateProvider
      .state("select", {
        /** virtual root of Select tab states */
        url: "/select",
        controller: "Select",
        controllerAs: "select",
        templateUrl: "/static/select/select.html",
        data: {
          requiresLogin: false
        },
        onEnter: ['selectStateService', function(selectStateService) {
            selectStateService.initService();
          }
        ]
      })
      .state("select.home", {
        url: "/home",
        templateUrl: "/static/select/templates/home.html"
      })
      .state("select.addProject", {
        url: "/addProject",
        templateUrl: "/static/select/templates/addProject.html",
        data: {
          requiresLogin: true
        },
        onEnter: ['attributesService', 'projectDataService', function(attributesService, projectDataService) {
            if (!attributesService.getAllAttributes()) {
              /** then the list of attributes is empty. Get it */
              attributesService.updateAllAttributes()
                .then(projectDataService.getProjectData({projectID: 0}));
            }
            else {
              projectDataService.getProjectData({projectID: 0});
            }
          }
        ]
      });
  };
  
}());

(function() {
  
  /**
   *  @name Select
   *  @desc Controller for the Select tab states
   * @requires ui-router
   * @requires attributesService
   * @requires loginStateService
   * @requires modalConfirmService
   * @requires projectDataService
   * @requires projectListService
   * @requires selectStateService
   */

  "use strict";
  
  angular
    .module("app.select")
    .controller("Select", Select);
  
  Select.$inject = ['$scope', '$state', 'attributesService', 'loginStateService', 'modalConfirmService', 'projectDataService', 'projectListService', 'selectStateService'];
  
  function Select($scope, $state, attributesService, loginStateService, 
                  modalConfirmService, projectDataService, projectListService, 
                  selectStateService) {
    
    this.state = $state;
    
    this.as = attributesService;
    this.ds = projectDataService;
    this.logss = loginStateService;

    this.ls = projectListService;
    this.masterList = this.ls.getMasterList;
    this.jumpToProject = this.ls.jumpToProject;
    
    this.ss = selectStateService;
    this.selectState = selectStateService.getMasterList;
    
    $scope.$on("$stateChangeStart", checkForDirtyAddProjectForm);

    /**
     *  @name checkForDirtyAddProjectForm
     *  @desc A listener for $stateChangeStart to prompt for unsaved changes on
     *        the add project form. Parameters are standard for listeners to
     *        this event.
     */
    function checkForDirtyAddProjectForm(event, toState, toParams, fromState, fromParams) {
      projectDataService.success = "";
      if (fromState.name == "state.addProject" && $scope.addProject.$dirty) {
        event.preventDefault();

        var modalOptions = {
            closeText: "Cancel",
            actionText: "Continue",
            headerText: "Unsaved changes",
            bodyText: "You have unsaved changes. Press Continue to discard your changes and" 
                      + " navigate away, or press Cancel to stay on this page."
        };

        modalConfirmService.showModal({}, modalOptions).then(function (result) {
          $scope.addProject.$setPristine();
          $state.go(toState, toParams);
        });
      }
    }
  };
  
}());

(function() {
  
  "use strict";
  
  angular
    .module("app.select")
    .filter("nameSearch", NameSearch);
  
  NameSearch.$inject = ['projectListService'];
  
  function NameSearch(projectListService) {
    return function(projects, searchText, name_absLogic, finalID) {
      /* return everything if no search string */
      if (!searchText) return projects;

      var projlen = projects.length || 0;
      var st = (searchText || "").toLowerCase();
      var words = st.split(" ");
      var quoted_words = _.map(words, function(word){
        return "'" + word + "'";
      });
      
      var out = projects;
      var descriptionList = [];
      var sqlList = [];
      
      if (finalID == "0") {
        out = _.filter(out, function(project) {
          return project.finalID == "0";
        });
        descriptionList.push("final state='still alive'");
        sqlList.push("final=0");
      }
      
      if (name_absLogic == "phrase") {
        out = _.filter(out, function(project) {
          return (project.name + " " + project.abstract).toLowerCase().match(st);
        });
        descriptionList.push("name or abstract contains " + "'" + searchText + "'");
        sqlList.push("name_abs=" + searchText);
        sqlList.push("name_absLogic=phrase");
      }
      else if (name_absLogic == "and") {
        _.map(words, function(word) {
          out = _.filter(out, function(project) {
            return (project.name + " " + project.abstract).toLowerCase().match(this);
          }, word);
        });
        descriptionList.push(" or abstract contains " + quoted_words.join(" and "));
        sqlList.push("name_abs=" + searchText);
        sqlList.push("name_absLogic=and");
      }
      else if (name_absLogic == "or") {
        var matches = [], partial;
        _.map( words, function(word) {
          partial = _.filter(out, function(project) {
            return (project.name + " " + project.abstract).toLowerCase().match(this);
          }, word);
          matches = _.union(partial, matches);
        });
        out = _.intersection(out, matches);
        descriptionList.push("name or abstract contains " + quoted_words.join(" or "));
        sqlList.push("name_abs=" + searchText);
        sqlList.push("name_absLogic=or");
      }

      var projectIDs = _.map(out, function(project){
        return project.projectID;
      });
      projectListService.setList(projectIDs);
      projectListService.setDescription(descriptionList.join(", "));
      projectListService.setSql(sqlList.join("&"));
      
      return out;
    };
  };
  
}());

(function() {
  
  /**
   * @name selectStateService
   * @desc Factory for the service providing the logic for Select tab states.
   *        It also manages the current values of the inputs to the Search
   *        and Breakdown by attribute functionalities.
   */

  "use strict";
  
  angular
    .module("app.select")
    .factory("selectStateService", selectStateService);
  
  selectStateService.$inject = ['$rootScope', '$http', '$state', 'projectListService', 'reportTableService'];
  
  function selectStateService($rootScope, $http, $state, projectListService, 
                              reportTableService) {
    var service = {
      masterList: {
        searchText: "",
        name_absLogic: "or",
        finalID: "0",
        breakdownAttr: null
      },
      clearBreakdown: clearBreakdown,
      clearSearchText: clearSearchText,
      getBreakdownByAttribute: getBreakdownByAttribute,
      getBreakdownChoices: getBreakdownChoices,
      getBreakdownTotal: getBreakdownTotal,
      getMasterList: getMasterList,
      initService: initService,
      jumpToBreakdownTable: jumpToBreakdownTable,
      setBreakdownChoices: setBreakdownChoices,
      updateBreakdownByAttribute: updateBreakdownByAttribute,
      updateBreakdownChoices: updateBreakdownChoices,
      SaveState: SaveState,
      RestoreState: RestoreState
    };

    RestoreState();
    if (typeof service.breakdownChoicesList == "undefined") {
      service.updateBreakdownChoices();
    }
    
    $rootScope.$on("savestate, service.SaveState");
    $rootScope.$on("restorestate, service.RestoreState");
      
    /**
     * @name clearBreakdown
     * @desc Hide Breakdown by attribute results and reset the list of selected
     *       projects
     */
    function clearBreakdown() {
      service.masterList.breakdownAttr = "";
      projectListService.resetList();
    }

    /**
     * @name clearSearchText
     * @desc Clear this input search text for the search by title and 
     *        and description filter, which clears/hides the filtered
     *        project list.
     */
    function clearSearchText() {
      service.masterList.searchText = "";
      projectListService.resetList();
    }

    /**
     * @name getBreakdownByAttribute
     * @desc Return the saved list of breakdown by attribute result rows
     *        by value. Values are returned in alphabetical order, except that
     *        the null result (the value whose id is zero) always comes first.
     */
    function getBreakdownByAttribute() {
      return service.breakdownByAttribute;
    }

    /**
     * @name getBreakdownChoices
     * @desc Return saved list of attributes available for breakdown by 
     *        attribute.
     */
    function getBreakdownChoices() {
      return service.breakdownChoicesList;
    }
    
    /**
     * @name getBreakdownTotal
     * @desc Return the sum of all the project counts in the breakdown by
     *        attribute results table.
     * @returns {number} total
     */
    function getBreakdownTotal() {
      var total = 0;
      _.each(service.breakdownByAttribute, function(row) {
        total += row.projectList.length;
      });
      return total;
    }

    function getMasterList() {
      return service.masterList;
    }

    /**
     * @name initService
     * @desc Initialize the list of selected projects to the state where all
     *        projects are selected, i.e., forgetting any selection criteria
     *        set under the Select or Filter Builder tabs.
     */
    function initService() {
      projectListService.resetList();
    }

    /**
     * @name jumpToBreakdownTable
     * @desc Jump from Breakdown by attribute results to the Report tab table 
     *        view of projects with the selected value of the breakdown
     *        attribute.
     * @param {Object} breakdown_row - an object describing breakdown results
     *        for a single value, consisting of:
     *          a label describing that value,
     *          a list of projectIDs that have that value,
     *          a human-readable description of the selected projects, as in
     *            "drivers='disaster recovery'"
     *          a query string describing the selection at the database level.
     *            The query string "driverID=3" goes with the human-readable
     *            version above.
     */
    function jumpToBreakdownTable(breakdown_row) {
      $state.go("report.table", {query_string: breakdown_row.query_string});
    }

    function RestoreState() {
      if (typeof sessionStorage.selectStateService != "undefined") {
        service.masterList = angular.fromJson(sessionStorage.selectStateService);
      }
    }

    function SaveState() {
      sessionStorage.selectStateService = angular.toJson(service.masterList);
    }
    
    /**
     * @name setBreakdownByAttribute
     * @desc Save the results of a request for a breakdown of projects by value
     *        of the selected attribute.
     */
    function setBreakdownByAttribute(result) {
      service.breakdownByAttribute = result.data.breakdown;
    }

    /**
     * @name setBreakdownChoices
     * @desc Save the results of a request for breakdown by attribute choices.
     */
    function setBreakdownChoices(result) {
      service.breakdownChoicesList = result.data.choices;
      service.SaveState();
    }
    
    /**
     * @name updateBreakdownByAttribute
     * @desc Ask the back end for a breakdown of projects by value of the 
     *        chosen attribute.
     */
    function updateBreakdownByAttribute() {
      $http.get("getBreakdownByAttribute/" + service.masterList.breakdownAttr.id)
        .then(setBreakdownByAttribute);
    }

    /**
     * @name updateBreakdownChoices
     * @desc Ask the back end for the list of attribute choices to populate the
     *        Break Down drop down menu.
     */
    function updateBreakdownChoices() {
      $http.get("getBreakdownChoices")
        .then(setBreakdownChoices);
    }
    
    SaveState();
    return service;    
  };
  
}());

(function() {
  
/**
 *  @name selectSubHeadings
 *  @desc Render Select tab subheadings from a template
 */  

  "use strict";
  
  angular
    .module("app.select")
    .directive("selectSubHeadings", SelectSubHeadings);
  
  function SelectSubHeadings() {    
    return {
      restrict: "EA",
      templateUrl: "/static/select/templates/subHeadings.html"
    };
  };

}());

(function(){

/**
 *  @name app.stateLocation
 *  @desc Manage the relationship between $state and $location, to allow a
 *        a change of state to update the location and vice versa.
 *  @requires ui-router
 */

  angular
    .module("app.stateLocation", ["ui.router"]);

}());

(function() {
  
/**
 *  @name sessionService
 *  @desc Provide brower sessionStorage for state history entities as JSON. 
 *        Easily extensible to other accessors.
 */
   
  "use strict";
  
  angular
    .module("app.stateLocation")
    .factory("sessionService", SessionService);
  
  function SessionService() {
    var service = {
      setStorage: setStorage,
      getStorage: getStorage,
      clear: clear,
      stateHistory: stateHistory,
      accessor: accessor
    };
    
    return service;
    
    function setStorage(key, value) {
      var json = value === void 0 ? null : JSON.stringify(value);
      return sessionStorage.setItem(key, json);
    };
    
    function getStorage(key) {
      return JSON.parse(sessionStorage.getItem(key));
    };
    
    function clear() {
      var results = [];
      for (key in sessionStorage) {
        results.push(service.setStorage(key, null));
      }
      return results;
    };
    
    function stateHistory(value) {
      if (value == null) {
        value = null;
      }
      return service.accessor("stateHistory", value);
    };
    
    function accessor(name, value) {
      if (value == null) {
        return service.getStorage(name);
      }
      return service.setStorage(name, value);
    };
    
  };
  
}());

(function() {

/**
 *  @name stateHistoryService
 *  @desc A factory for the service that saves the most recent state and
 *        parameters, keyed by location. It allows the app to look at the
 *        current location and decide whether or not it indicates a state
 *        change. Storage management is handled by the sessionService
 *        service.
 *  @requires app.stateLocation.sessionService
 */ 

  "use strict";
  
  angular
    .module("app.stateLocation")
    .factory("stateHistoryService", StateHistoryService);
  
  StateHistoryService.$inject = ['sessionService'];
  
  function StateHistoryService(sessionService) {
    var service = {
      "set": set,
      "get": get
    };
    
    return service;
    
    function set(key, state) {
      var hcheck = sessionService.stateHistory();
      var history = hcheck != null ? hcheck : {};
      history[key] = state;
      return sessionService.stateHistory(history);
    }
    
    function get(key) {
      var history = sessionService.stateHistory();
      return history != null ? history[key] : void 0;
    }
  };
  
}());

(function() {
  
/**
 *  @name stateLocationRun
 *  @desc Set up event listeners for $stateChangeSucess and 
 *        $locationChangeSuccess. These listeners are intended to ensure that
 *        a state change can change the location without having that trigger
 *        another state change, and vice versa.
 */

  "use strict";
  
  angular
    .module("app.stateLocation")
    .run(stateLocationRun);
  
  stateLocationRun.$inject = ['$rootScope', '$state', 'stateLocationService'];

  function stateLocationRun($rootScope, $state, stateLocationService) {
    $rootScope.$on('$stateChangeSuccess', function(event, toState, toParams) {
      stateLocationService.stateChange();
    });

    $rootScope.$on('$locationChangeSuccess', function() {
      stateLocationService.locationChange();
    });
  }
  
}());

(function() {

/**
 *  @name stateLocationService
 *  @desc A factory for a service to manage the relationship between $state and
 *        $location, to allow one to invoke the other without causing the first
 *        to run again.
 * @requires ui-router

 *
 *  The event bindings are in the stateLocation.stateLocationRun module.
 */  
  "use strict";
  
  angular
    .module("app.stateLocation")
    .factory("stateLocationService", stateLocationService);
  
  stateLocationService.$inject = ['$rootScope', '$location', '$state', '$stateParams', 'stateHistoryService', 'projectListService'];
 
  function stateLocationService($rootScope, $location, $state, $stateParams, 
                                stateHistoryService, projectListService){
    var service = {
      preventCall: [],
      locationChange: locationChange,
      getCurrentState: getCurrentState,
      getStateFromLocation: getStateFromLocation,
      saveState: saveState,
      stateChange: stateChange,
      saveCurrentState: saveCurrentState,
      guid: guid,
      s4: s4
    };
    
    window.onbeforeunload = function (event) {
      $rootScope.$broadcast('savestate');
    };
  
    return service;
    
    /**
     *  @name getCurrentState
     *  @desc restore state and parameters from sessionStorage
     */
    function getCurrentState() {
      return angular.fromJson(sessionStorage.currentState);
    }
    
    /**
     *  @name locationChange
     *  @desc Event listener for $locationChangeSuccess. Figure out which state
     *        is implied by the new location and go there, with the appropriate
     *        parameters. Leave a marker to prevent another state change after
     *        that. Similarly, ignore making a state change, if we just came
     *        from one.
     */
    function locationChange() {
      //if (service.preventCall.pop('locationChange') != null) {
      var ignore_next = service.preventCall.pop();
      if (ignore_next == "locationChange") {
        return;
      }
      else if (typeof ignore_next != "undefined") {
        /** if we got something, put it back where it came from */
        service.preventCall.push(ignore_next);
      }
      var location = $location.url();
      //var hashless_loc = location.substring(0, _.lastIndexOf(location, "#"));
      var entry = stateHistoryService.get(location);
      if (entry == null) {
        return; //var entry = service.getStateFromLocation();
      }
      //if ("projectID" in entry.params) {
      //  projectListService.setProjectID(entry.params.projectID);
      //}
      //service.preventCall = ["stateChange"];
      service.preventCall.push("stateChange");
      $state.go(entry.name, entry.params, {location: false});
    };
    
    /**
     *  @name getStateFromLocation
     *  @desc Get the name and parameters of the state that corresponds to the
     *        current state.
     */
    function getStateFromLocation() {
      var state = new Object;
      state.params = new Object;
      var path = $location.path().split("/").reverse();
      path.pop();
      var base = path.pop();

      if (base == "project") {
        var projectID;
        var commentID;
        var disposedInFY;
        var disposedInQ;
        if (_.last(path) == "comment" && path[1] == "detail") {
          state.name = "project.comment.edit.detail";
          state.params.commentID = parseInt(path[0]);
          state.params.projectID = parseInt(path[2]);
        }
        else if (_.last(path) == "disposition" && path[2] == "detail") {
          state.name = "project.disposition.edit.detail";
          state.params.projectID = parseInt(path[3]);
          state.params.disposedInFY = parseInt(path[1]);
          state.params.disposedInQ = parseInt(path[0]);
        }
        else if (path.length == 1) {
          state.name = "project.detail";
          state.params.projectID = parseInt(path[0]);
        }
        else {
          state.name = ["project", path[2], path[1]].join(".");
          state.params.projectID = parseInt(path[0]);
        }
      }

      else if (base == "filter") {
        if (path[1] == "attributes") {
          state.name = "filter.builder.attributes";
          state.params.query_string = path[2];
          state.params.attribute_list = path[0];
        }
        else {
          state.name = "filter.builder";
          state.params.query_string = path[0];
        }
      }
      else if (base == "report") {
        if (path[1] == "columns") {
          state.name = "report.columns";
          state.params.query_string = path[0];
        }
        else {
          state.name = "report.table";
          state.params.query_string = path[0];
        }
      }
      else {
        state.name = [base].concat(path).join(".");
      }
      return state;
    }
    
    /**
     *  @name stateChange
     *  @desc Event listener for $stateChangeSuccess. Figure out the url that
     *        corresponds to the new state and then call $location to put
     *        that url in the location bar. Leave a marker to prevent that
     *        change from causing another state change. Similarly, ignore
     *        changing the location if the state change waw triggered by a
     *        location change.
     */
    function stateChange() {
      var ignore_next = service.preventCall.pop();
      if (ignore_next == "stateChange"){
        return;
      }
      else if (typeof ignore_next != "undefined") {
        /** if we got something, put it back where it came from */
        service.preventCall.push(ignore_next);
      }
      if (!$state.current.name) {
        return;
      }
      var url = getUrlFromState();
      var entry = {
        "name": $state.current.name,
        "params": $stateParams
      };
      stateHistoryService.set(url, entry);
      service.preventCall.push('locationChange');
      $location.url(url);
    }
    
    /**
     *  @name getUrlFromState
     *  @desc get the url from the current state. Inspect the url to see which
     *        tab the state is under. Depending on the answer, add a hash to
     *        the end of the url for browser history.
     */
    function getUrlFromState() {
      var url = $state.href($state.current, $state.params);
      if (url[0] == "#") {
        url = url.substring(1);
      }
      var hash = service.guid().substr(0, 8);
      
      var tab = _.first($state.current.name.split("."));
      if (tab == 'project') {
        url = $location.hash(hash);
      }
      else if (tab == "report") {
        url = $location.hash(hash);
      }
      if (typeof url == "object") {
        return url.url();
      }
      else if (typeof url == "string") {
        return url;
      }
    }
    
    function saveCurrentState() {
      if ($state.current.name) {
        var entry = {
          "name": $state.current.name,
          "params": $state.params
        };
        sessionStorage.currentState = angular.toJson(entry);
      }
    }
    
    function saveState() {
      if ($state.current.name) {
        var entry = {
          "name": $state.current.name,
          "params": $state.params
        };
        var url = $location.url();
        stateHistoryService.set(url, entry);
      }
     }
    
    function guid() {
      return "" + (service.s4()) + (service.s4()) + "-" + (service.s4()) + "-" + (service.s4()) + "-" + (service.s4()) + "-" + (service.s4()) + (service.s4()) + (service.s4());
    };
    
    function s4() {
      return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
    }
  };
  
}());

(function() {
  
  angular
    .module("app.title", ['ui.router']);
  
}());

(function() {
  
  "use strict";
  
  angular
    .module("app.title")
    .controller("Title", Title);
  
  Title.$inject = ['$rootScope', '$state', 'projectListService', 'stateLocationService'];
  
  function Title($rootScope, $state, projectListService, stateLocationService){
    var vm = this;
    
    this.masterList = projectListService.getMasterList;
    this.pageTitle = "PPT: Select";
    
    $rootScope.$on("$locationChangeSuccess", function(e, toState){
      var state = stateLocationService.getStateFromLocation();
      var tab = _.first(state.name.split("."));
      if (tab == "select") {
        vm.pageTitle = "PPT: Select";
      }
      else if (tab == "filter") {
        vm.pageTitle = "PPT: Filter Builder";
      }
      else if (tab == "report") {
        vm.pageTitle = "PPT: Report";
      }
      else if (tab == "project") {
        vm.pageTitle = state.params.projectID + ". " + vm.masterList().projectName;
      }  
      else if (tab == "comment") {
        vm.pageTitle = "PPT: Comments";
      }
      else if (tab == "curate") {
        vm.pageTitle = "PPT: Curate";
      }
      else if (tab == "manage") {
        vm.pageTitle = "PPT: Manage";
      }
      else {
        vm.pageTitle = "PPT: Select";
      }      
    });

  }

}());
