(function() {
  
  "use strict";
  
  angular
    .module("app.manage")
    .controller("Manage", Manage);
  
  Manage.$inject = ["$rootScope"];
  
  function Manage($rootScope) {
    
    this.currentUser = $rootScope.currentUser;
    
  };
  
}());