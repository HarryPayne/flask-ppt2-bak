(function() {
  
  /**
   *   @name loginApiService
   *   @desc A factory for a service that sends login information to the server
   *         and returns the result. If successful, the result is a jwt that
   *         includes information about the current user, including roles for
   *         authorization.
   */
  
  "use strict";
  
  angular
    .module("app.login")
    .factory("loginApiService", LoginApiService);
  
  LoginApiService.$inject = ["$rootScope", "$http", "$state", "store"];
  
  function LoginApiService($rootScope, $http, $state, store) {
    var service = {
      deleteAndGo: deleteAndGo,
      login: login,
      logout: logout,
      logoutRequest: logoutRequest
    };
    return service;    
  
    /**
     *  @name login
     *  @desc 
     */
    function login(login_token, username, password) {
      return $http({
        url: "/auth",
        method: "POST",
        headers: {
          "Content-Type": "application/json; charset=UTF-8",
          "X-CSRFToken": login_token
        },
        data: {
          username: username, 
          password: password
        }
      });
    };

    function logout() {
      service.currentState = $state.current;
      service.currentParams = $state.params;
      service.logoutRequest()
        .then(service.deleteAndGo);
    };

    
    function logoutRequest() {
      var request = {
          url: "/logout",
          method: "POST",
          headers: {
            "Content-Type": "application/json; charset=UTF-8",
            "X-CSRFToken": window.csrf_token
          }
        }
      return $http(request)
    }

    function deleteAndGo() {
      store.remove('jwt');
      delete $rootScope.currentUser;
      if (service.currentState.data.requiresLogin) {
        if (_.first(service.currentState.name.split(".")) == "project") {
          $state.go("project.detail", service.currentParams);
        }
      }
      else {
        $state.go(service.currentState.name, service.currentParams);
      }
    }
  };
  
}());