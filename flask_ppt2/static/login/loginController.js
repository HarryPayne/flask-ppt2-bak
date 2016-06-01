(function() {
  
  /**
   *  @name Login
   *  @desc A controller for handling the results of user action of the login
   *        page. Either 
   *          * submit the login information and then close the Bootstrap modal 
   *            in the current scope, or
   *          * just dismiss the Bootstrap modal. 
   */
  
  "use strict";
  
  angular
    .module("app.login")
    .controller("Login", Login);
  
  Login.$inject = ["$q", "$state", "$http", "$scope", "$uibModalInstance", 
                   "loginApiService"];
  
  function Login($q, $state, $http, $scope, $uibModalInstance, loginApiService) {
    var vm = this;
    var request = {
      method: "POST",
      url: "/getLoginToken",
      headers: {
        "Content-Type": "application/json; charset=UTF-8",
        "X-CSRFToken": window.csrf_token
      }
    }
    $http(request)
      .then(function(response) {
        vm.login_token = response.data.csrf_token;
      });

    this.cancel = $scope.dismiss;
    this.submit = submitLogin;
  
    function submitLogin(username, password) {
      loginApiService.login(vm.login_token, username, password)
        .then(
          function (user) {
            $uibModalInstance.close(user);
          },
          function ($scope) {
            $uibModalInstance.dismiss("cancelled");
          }
        );
    }
    
  };
  
}());