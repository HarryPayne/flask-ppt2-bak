(function() {
  
  "use strict";
  
  angular
    .module("app.filter")
    .controller("Filter", Filter);
  
  Filter.$inject = ["projectListService", "selectStateService"];
  
  function Filter(projectListService, selectStateService) {
    
    this.ls = projectListService;
    this.masterList = projectListService.getMasterList;
    this.jumpToProject = this.ls.jumpToProject;
    
    this.selectState = selectStateService;

  };
  
}());
