(function() {
  
  /**
   * @name Home
   * @desc Controller for the Home tab states.
   */
  
  "use strict";
  
  angular
    .module("app.home")
    .controller("Home", Home);
  
  Home.$inject = ["$scope", "$state"];
  
  function Home($scope, $state) {
    this.state = $state;
  };
  
}());