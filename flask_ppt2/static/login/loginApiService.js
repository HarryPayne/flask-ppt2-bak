(function() {
  
  "use strict";
  
  angular
    .module("app.login")
    .factory("loginApiService", loginApiService);
  
  loginApiService.$inject = ["$http"];
  
  function loginApiService($http) {
    var service = {login: login};

    return service;    
  
    function login(username, password) {
      return $http({
        url: "/auth",
        method: "POST",
        data: {"username": username, 
               "password": password}
      });
    };
  };
  
}());