(function() {
  
  /**
   *  @name PPTConfig
   *  @desc Configuration for PPT app. 
   */
  "use strict";
  
  angular
    .module("PPT")
    .config(PPTConfig);
  
  PPTConfig.$inject = ["$urlRouterProvider"];
  
  /**
   * Make "/select/home" the default ui.router state.
   */
  function PPTConfig($urlRouterProvider) {
    $urlRouterProvider.otherwise('/select/home');
  };
  
}());
