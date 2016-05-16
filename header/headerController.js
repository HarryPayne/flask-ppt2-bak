(function() {
  
  "use strict";
  
  angular
    .module("app.header")
    .controller("Header", Header);
  
  Header.$inject = ["$rootScope", "$state", "projectListService", "loginStateService"];
  
  function Header($rootScope, $state, projectListService, loginStateService) {
    var vm = this;
    
    this.currentUser = $rootScope.currentUser;
    this.masterList = projectListService.getMasterList;
    this.getSql = projectListService.getSql;
    this.getNextID = projectListService.getNextID;
    this.getPreviousID = projectListService.getPreviousID;
    this.getProjectID = projectListService.getProjectID;
    this.hasNextID = projectListService.hasNextID;
    this.hasPreviousID = projectListService.hasPreviousID;

    this.loggedIn = loginStateService.loggedIn;
    this.login = loginStateService.login;
    this.logout = loginStateService.logout;

    this.jumpToNextProject = jumpToNextProject;
    this.jumpToPreviousProject = jumpToPreviousProject;
    
    $rootScope.$on("$stateChangeSuccess", function(e, toState){
      vm.isActive = isActive;
      vm.hasNext = hasNext;
      vm.hasPrevious = hasPrevious;

      function isActive(name) {
        return toState.name.split(".")[0] === name;
      }; 
  
      function hasNext() {
        return (vm.isActive("project") && vm.masterList().next > -1);
      };
  
      function hasPrevious() {
        return (vm.isActive("project") && vm.masterList().previous > -1);
      };
    });
    
    function jumpToNextProject() {
      if (vm.masterList().next > -1) {
         projectListService.jumpToProject(vm.masterList().next);
      }
    };

    function jumpToPreviousProject () {
      if (vm.masterList().previous > -1) {
         projectListService.jumpToProject(vm.masterList().previous);
      }
    };
  }

  
}());
