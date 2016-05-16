(function() {
  
  /**
   *  @name filterConfig
   *  @desc Configuration for app.filter module
   */
  
  "use strict";
  
  angular
    .module("app.filter")
    .config(filterConfig);
  
  filterConfig.$inject = ["$stateProvider"];
  
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
          query_string: ["$stateParams", function($stateParams) {
            return $stateParams.query_string;
          }]
        },
        /** service initialization */
        onEnter: ["reportTableService", 
          function(reportTableService) {
            reportTableService.initService();
          }
        ]

      })
      .state("filter.builder.attributes", {
        url: "/attributes/:attribute_list",
        templateUrl: "/static/filter/templates/attributes.html",
        controller: function ($stateParams, query_string) {
          $stateParams.query_string = query_string;
          console.log($stateParams, query_string);
        }
      });
  };
  
}());
