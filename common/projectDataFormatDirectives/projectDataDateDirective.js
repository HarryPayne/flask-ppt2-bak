(function() {
  
  "use strict";
  
  angular
    .module("app.common")
    .directive("projectDataDate", ProjectDataDate);
  
  function ProjectDataDate() {
    
    return {
      restrict: "EA",
      templateUrl: "static/common/projectDataFormatDirectives/projectDataDate.html" 
    };
    
  }
  
}());
