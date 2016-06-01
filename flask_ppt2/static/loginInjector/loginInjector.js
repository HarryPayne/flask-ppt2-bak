(function() {

  "use strict";

  angular
    .module("app.loginInjectorProvider")
    .factory("loginInjector", LoginInjector);

  LoginInjector.$inject = ["$q", "$injector", "$timeout"];

  function LoginInjector($q, $injector, $timeout) {
    /* Avoid `Uncaught Error: [$injector:cdep] Circular dependency found` */
    /* http://brewhouse.io/blog/2014/12/09/authentication-made-simple-in-single-page-angularjs-applications.html */ 
    $timeout(function () { 
      var loginService = $injector.get("loginService");
      var $http = $injector.get("$http");
      var $state = $injector.get("$state");
    }); 

    var service = {
      responseError: responseError
    };

    return service;

    function responseError(rejection) {
      if (rejection.status !== 401) {
        return rejection;
      }

      var deferred = $q.defer();

      if (typeof loginService != "undefined") {
        loginService()
          .then(
            function () {
              deferred.resolve( $http(rejection.config) );
            },
            function () {
              deferred.reject(rejection);
            }
          );
      }
      else {
        deferred.reject(rejection);
      }

      return deferred.promise;
    };
  }
        
}());