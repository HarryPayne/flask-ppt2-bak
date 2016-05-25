(function() {
  
  "use strict";
  
  angular
    .module("app.curate")
    .config(curateConfig);
  
  curateConfig.$inject = ["$stateProvider"];
  
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
