(function() {
  
  "use strict";
  
  angular
    .module("app.attributes")
    .controller("Attributes", Attributes);
  
  Attributes.$inject = ["$scope", "$state", "attributesService"];
  
  function Attributes($scope, $state, attributesService) {
    
    this.als = attributesService;
    this.attributes = this.als.getAttributes;

  };
  
}());
