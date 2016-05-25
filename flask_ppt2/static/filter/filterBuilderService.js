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
  
  FilterBuilderService.$inject = ["projectListService", "reportTableService",
                                  "stateLocationService"];
  
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
