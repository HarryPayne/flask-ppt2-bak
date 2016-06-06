(function() {
  
  /**
   * @name homeSubHeadings
   * @desc A directive to render Home tab subheadings from a template.
   */
  
  "use strict";
  
  angular
    .module("app.home")
    .directive("homeSubHeadings", HomeSubHeadings);
  
  function HomeSubHeadings() {
    return {
      restrict: "EA",
      templateUrl: "/static/home/templates/subHeadings.html"
    }
  }
  
}());