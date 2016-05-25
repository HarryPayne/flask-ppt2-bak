(function() {
  
/**
 *  @name selectSubHeadings
 *  @desc Render Select tab subheadings from a template
 */  

  "use strict";
  
  angular
    .module("app.select")
    .directive("selectSubHeadings", SelectSubHeadings);
  
  function SelectSubHeadings() {    
    return {
      restrict: "EA",
      templateUrl: "/static/select/templates/subHeadings.html"
    };
  };

}());
