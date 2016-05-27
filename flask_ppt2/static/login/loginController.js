(function() {
  
  /**
   *  @name Login
   *  @desc A controller for handling the results of user action of the login
   *  			page. Either 
   *  				* submit the login information and then close the Bootstrap modal 
   *  					in the current scope, or
   *  				* just dismiss the Bootstrap modal. 
   */
	
	"use strict";
  
  angular
    .module("app.login")
    .controller("Login", Login);
  
  Login.$inject = ["$http", "$scope", "loginApiService"];
  
  function Login($http, $scope, loginApiService) {
    var vm = this;
    vm.csrf_token = "";
	var request = {
		method: "GET",
		url: "/getLoginToken",
		data: {username: ""}
	}
	$http(request)
		.then(function(response) {
			vm.csrf_token = response.data.csrf_token;
		});
	this.cancel = $scope.$dismiss;
	this.submit = submitLogin;

	function submitLogin(username, password) {
	  if (vm.csrf_token != "") {
		  loginApiService.login(vm.csrf_token, username, password).then(function (user) {
			$scope.$close(user);
		  });
	  }
	}
  };
  
}());