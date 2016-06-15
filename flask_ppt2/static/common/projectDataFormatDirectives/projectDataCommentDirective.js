(function() {
  
  "use strict";
  
  angular
    .module("app.common")
    .directive("projectDataComment", ProjectDataComment);
  
  function ProjectDataComment() {
    
    return {
      restrict: "EA",
      templateUrl: "static/common/projectDataFormatDirectives/projectDataComment.html",
      link: function(scope, element, attributes, ctrl) {
        console.log(scope);
      }
    };
    
  }
  
}());
