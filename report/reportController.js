(function() {
  
  /**
   *  @name Report
   *  @desc A controller for the states and views associated with the Report tab
   */
  
  "use strict";
  
  angular
    .module("app.report")
    .controller("Report", Report);
  
  Report.$inject = ["$state", "$stateParams", "projectListService", "reportTableService"];
  
  function Report($state, $stateParams, projectListService, reportTableService) {
    
    this.ls = projectListService;
    this.masterList = this.ls.getMasterList;
    this.jumpToProject = this.ls.jumpToProject;

    this.ts = reportTableService;
    this.state = $state;

  }
  
}());
