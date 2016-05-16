(function() {
  
  "use strict";
  
  angular
    .module("app.manage")
    .config(manageConfig);
  
  manageConfig.$inject = ["$stateProvider"];
  
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