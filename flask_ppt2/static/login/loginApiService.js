(function() {
  
  /**
   * 	@name loginApiService
   * 	@desc	A factory for a service that sends login information to the server
   * 				and returns the result. If successful, the result is a jwt that
   * 				includes information about the current user, including roles for
   * 				authorization.
   */
	
	"use strict";
  
  angular
    .module("app.login")
    .factory("loginApiService", LoginApiService);
  
  LoginApiService.$inject = ["$http"];
  
  function LoginApiService($http) {
    var service = {login: login};
    return service;    
  
    function login(csrf_token, username, password) {
      return $http({
        url: "/auth",
        method: "POST",
        headers: {
	      "Content-Type": "application/json; charset=UTF-8",
	      "X-CSRFToken": csrf_token
        },
        data: {
          username: username, 
          password: password
        }
      });
    };
  };
  
}());