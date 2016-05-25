(function() {
  
  "use strict";
  
  angular
    .module("app.login")
    .controller("Login", Login);
  
  Login.$inject = ["$scope", "loginApiService"];
  
  function Login($scope, loginApiService) {
    var vm = this;
    
    this.cancel = $scope.$dismiss;
    this.submit = submitLogin;
    
    function submitLogin(email, password) {
      loginApiService.login(email, password).then(function (user) {
        $scope.$close(user);
      });
    }
  };
  
}());