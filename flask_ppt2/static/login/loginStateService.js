(function() {
  
  /**
   *  @name loginStateService
   *  @desc A factory for a service that provides information about the user's
   *        login status and roles, as well as handling the login process.
   */

  "use strict";
  
  angular
    .module("app.login")
    .factory("loginStateService", loginStateService);
  
  loginStateService.$inject = ["$rootScope", "$http", "$state", "store", "jwtHelper", 
                               "loginService"];
  
  function loginStateService($rootScope, $http, $state, store, jwtHelper, loginService) {
    var service = {
      can_edit_roles: ["Curator", "Manager"],
      can_add_project_roles: ["Curator"],
      canAddComments: canAddComments,
      canAddProjects: canAddProjects,
      canEditProjects: canEditProjects,
      hasRole: hasRole,
      loggedIn: loggedIn,
      login: login,
      SaveState: SaveState,
      RestoreState: RestoreState
    };
    
    return service;    
    
    function canAddComments() {
      if ($rootScope.currentUser) {
        return true;
      }
      return false;
    }

    function canAddProjects() {
      if ($rootScope.currentUser) {
        if (_.intersection($rootScope.currentUser.roles, service.can_add_project_roles)) {
          return true;
        }
      }
      return false;
    }

    function canEditProjects() {
      if ($rootScope.currentUser) {
        if (_.intersection($rootScope.currentUser.roles, service.can_edit_roles)) {
          return true;
        }
      }
      return false;
    }

    function hasRole(role) {
      if ($rootScope.currentUser) {
        if (_.contains($rootScope.currentUser.roles, role)) {
          return true;
        }
      }
      return false;
    }

    function loggedIn() {
      return Boolean(store.get('jwt'));
    }
    
    /**
     *  @name login
     *  @desc Instantiate a service that opens a login modal popup.
     */
    function login() {
      var currentState = $state.current;
      var currentParams = $state.params;
      loginService()
        .then(
          function () {
            $state.go(currentState, currentParams);
          },
          function () {
            if (currentState && currentState.data.loginRequired) {
              $state.go("select.home");
            }
            else if (currentState) {
              $state.go(currentState, currentParams)
            }
          }
        );
    }

    function SaveState() {
      sessionStorage.loginStateService = angular.toJson(service.masterList);
    }
    
    function RestoreState() {
      service.masterList = angular.fromJson(sessionStorage.loginStateService);
    }
    
    $rootScope.$on("savestate, service.SaveState");
    $rootScope.$on("restorestate, service.RestoreState");
  };
   
}());