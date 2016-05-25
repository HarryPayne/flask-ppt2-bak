(function() {
  
  "use strict";
  
  angular
    .module("app.common")
    .directive("projectDataDisposition", ProjectDataDisposition);
  
  function ProjectDataDisposition() {
    
    return {
      restrict: "EA",
      templateUrl: "static/common/projectDataFormatDirectives/projectDataDisposition.html"
    };
    
  }
  
}());
