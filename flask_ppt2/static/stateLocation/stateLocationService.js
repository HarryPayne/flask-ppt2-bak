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
  
  stateLocationService.$inject = ["$rootScope", "$location", "$state", "$stateParams", 
                                  "stateHistoryService", "projectListService"];
 
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
