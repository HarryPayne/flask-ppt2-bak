(function() {

  /**
   *  @name reportTableSubHeadings
   *  @desc Render report-specific subheadings from a template
   */

  "use strict";

  angular
    .module("app.report")
    .directive("reportTableSubHeadings", ReportTableSubHeadings);

  function ReportTableSubHeadings() {

    function controller() {
      var vm = this;
    }

    return {
      bindToController: true,
      controller: controller,
      controllerAs: "ctrl",
      link: function(scope, element, attributes, ctrl) {
        console.log("reportTableSubHeadings");
      },
      scope: {
        report: "="
      },
      templateUrl: "static/report/templates/subHeadings.html"
    };
  }

}());