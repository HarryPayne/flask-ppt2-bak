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
