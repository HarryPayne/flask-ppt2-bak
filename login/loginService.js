(function() {
  
  "use strict";
  
  angular
    .module("app.login")
    .service("loginService", loginService);
  
  loginService.$inject = ["$modal", "$rootScope", "store", "jwtHelper"];
  
  function loginService($modal, $rootScope, store, jwtHelper) {

    return getUserViaModal;
    
    function getUserViaModal() {
      var instance = $modal.open({
        templateUrl: "static/login/login.html",
        controller: "Login",
        controllerAs: "login"
      });

      return instance.result.then(assignCurrentUser);
    };

    function assignCurrentUser(response) {
      if (response.status == 200) {
        store.set("jwt", response.data.token);
        var user = jwtHelper.decodeToken(response.data.token);
        $rootScope.currentUser = user;
        return user;
      }
      return response;
    };
  };
  
}());