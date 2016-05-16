(function() {
  
  "use strict";
  
  angular
    .module("app.common")
    .directive("projectDataDispositionDetail", ProjectDataDispositionDetail);
  
  function ProjectDataDispositionDetail() {
    
    function controller() {
      var vm = this;
    }

    return {
      restrict: "EA",
      templateUrl: "static/common/projectDataFormatDirectives/projectDataDispositionDetail.html"
    };
    
  }
  
}());
