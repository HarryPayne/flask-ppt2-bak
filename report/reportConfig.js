(function() {
  
  /**
   *  @name reportConfig
   *  @desc Configuration for app.report module
   */
  
  "use strict";
  
  angular
    .module("app.report")
    .config(reportConfig);
   
  reportConfig.$inject = ["$stateProvider"];
  
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
        controller: function ($stateParams) {
          console.log($stateParams);
        }
      })
      .state("report.table", {
        /** state for the View Project List as Table view */
        url: "/:query_string",
        templateUrl: "/static/report/templates/table.html",
        controller: function ($stateParams) {
          console.log($stateParams);
        }
      });
  }
  
}());
