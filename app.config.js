(function() {
  
  "use strict";
  
  angular
    .module("PPT")
    .config(PPTConfig);
  
  PPTConfig.$inject = ["$urlRouterProvider"];
  
  function PPTConfig($urlRouterProvider) {
    $urlRouterProvider.otherwise('/select/home');
  };
  
}());
