(function() {
  
  "use strict";
  
  angular
    .module("app.common")
    .directive("projectDataCommentDetail", ProjectDataCommentDetail);
  
  function ProjectDataCommentDetail() {
    
    function controller() {
      var vm = this;
    }

    return {
      controller: controller,
      controllerAs: "detailCtrl",
      restrict: "EA",
      templateUrl: "static/common/projectDataFormatDirectives/projectDataCommentDetail.html",
      link: function(scope, element, attributes, ctrl) {
        console.log("");
      },
    };
    
  }
  
}());
