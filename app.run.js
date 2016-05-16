(function() {
  
  "use strict";
  
  angular
    .module("PPT")
    .run(initializeApp);
  
  initializeApp.$inject = ["$rootScope"];
  
  function initializeApp($rootScope) {
    $rootScope.$on("$stateChangeStart", _initializeApp);
    
    function _initializeApp(e, toState, toParams, fromState, fromParams){
      window.onbeforeunload = function (event) {
        // save state before navigating away from the application
        $rootScope.$broadcast('savestate');
      };
      
    }   
  }
  
}());