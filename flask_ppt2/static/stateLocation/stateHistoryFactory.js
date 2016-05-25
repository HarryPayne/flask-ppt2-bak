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
  
  StateHistoryService.$inject = ["sessionService"];
  
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
