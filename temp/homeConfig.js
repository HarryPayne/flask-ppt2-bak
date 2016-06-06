(function() {
  
  /**
   * @name homeConfig
   * @desc Configuration for the app.home module.
   */
  
  "use strict";
  
  angular
    .module("app.home")
    .config(homeConfig)
    
  homeConfig.$inject = ["$stateProvider"];
  
  function homeConfig($stateProvider) {
    $stateProvider
      .state("home", {
        url: "/home",
        controller: "Home",
        controllerAs: "home",
        templateUrl: "/static/home/home.html",
        data: {requiresLogin: false}
      })
      .state("home.index", {
        url: "/index",
        templateUrl: "/static/home/templates/index.html"
      });
  }
  
}());