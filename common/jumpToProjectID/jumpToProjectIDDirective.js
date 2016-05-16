(function() {
  
  /*
   *  @name jumpToProjectID
   *  @desc Render a form with a number type input field and on submit execute
   *        a callback function, passing in the input.
   *  
   *  Used under the Select tab to input a projectID and call a function to 
   *  jump to that project under the Project tab. Here is the HTML for the
   *  prototype application of this directive:
   *
   *    <div jump-to-project-id label="'Jump'" on-submit="select.jumpToProject"
   *      help="'Enter a numeric project ID and go to that project.'"></div>
   *
   *  Notice that the onSubmit reference does not have parentheses at the end.
   */

  "use strict";
  
  angular
    .module("app.common")
    .directive("jumpToProjectId", JumpToProjectID);
  
  function JumpToProjectID() {      
    function controller() {
      this.projectID;
      this.jump = jump;
    }

    return {
      restrict: "EA",
      scope: {
        label: "=",
        help: "=",
        onSubmit: "&"
      },
      controller: controller,
      controllerAs: "ctrl",
      bindToController: true,
      templateUrl: "static/common/jumpToProjectID/jumpToProjectID.html",
      link: function(scope, element, attributes, ctrl) {
        /** when the form in the template is submitted call the controller's
            jump function */
        scope.submit = ctrl.jump;
      }
    };

    /**
     *  @name jump
     *  @desc A sneaky way of passing a single item of form data to the external 
     *        function without caring what the parameter name is. We stored a
     *        reference to the function in ctrl.onSubmit. The first pair of
     *        parentheses just gives you the function. The second pair is the
     *        function parameter list.
     */
    function jump() {
      this.ctrl.onSubmit()(this.ctrl.projectID);
    }

  };
  
}());
