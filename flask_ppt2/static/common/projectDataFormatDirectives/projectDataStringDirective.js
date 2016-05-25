(function() {
  
  "use strict";
  
  angular
    .module("app.common")
    .directive("projectDataString", ProjectDataString);
  
  function ProjectDataString() {
    
    return {
      restrict: "EA",
      templateUrl: "static/common/projectDataFormatDirectives/projectDataString.html" 
    };
    
  }
  
}());
