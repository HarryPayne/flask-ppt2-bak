(function() {
  
  "use strict";
  
  angular
    .module("app.login")
    .config(loginConfig);
  
  loginConfig.$inject = ["jwtInterceptorProvider", "$httpProvider"];
  
  function loginConfig(jwtInterceptorProvider, $httpProvider) {

    jwtInterceptorProvider.tokenGetter = function(store) {
      return store.get('jwt');
    };

    $httpProvider.interceptors.push('jwtInterceptor');

    $httpProvider.interceptors.push('loginInjector');
  }
    
}());