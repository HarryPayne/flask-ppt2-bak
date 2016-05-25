(function() {
  
  "use strict";
  
  angular
    .module("app.comment")
    .controller("Comment", Comment);
  
  Comment.$inject = ["$scope", "$rootScope"];
  
  function Comment($scope, $rootScope) {
    
    this.currentUser = $rootScope.currentUser;
  }
  
}());