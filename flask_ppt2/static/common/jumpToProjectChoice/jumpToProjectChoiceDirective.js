(function() {
  
  /*
   *  @name jumpToProjectChoice
   *  @desc Render a form with a select element and on submit execute a 
   *        callback function, passing in the input.
   *  
   *  Used under the Select tab to select a project from a list and call a 
   *  function to jump to that project under the Project tab. Here is the HTML 
   *  for the prototype application of this directive:
   *
   *    <div jump-to-project-choice label="'Select'" 
   *      on-submit="select.jumpToProject"
   *      options="select.masterList().allProjects" 
   *      help="'Select a project from the list and go to that project.'"></div>
   *
   *  Notice that the onSubmit reference does not have parentheses at the end.
   *
   *  The attributes for this directive are:
   *
   *    options - a list of objects with "name" and "projectID" attributes for
   *      rendering the option elements for the select element.
   *    help - text for an aria-describedBy block, to explain the use of this
   *      field.
   *    label - text to label the input field.
   *    on-submit - tThe function to be run when the form is submitted.
   */

  "use strict";
  
  angular
    .module("app.common")
    .directive("jumpToProjectChoice", JumpToProjectChoice);
  
  function JumpToProjectChoice() {      
    /**
     *  @name controller
     *  @desc A simple controller for pulling together the form data and the
     *        scope data.
     */
    function controller() {
      this.option;
      this.jump = jump;
    }

    return {
      restrict: "EA",
      scope: {
        help: "=",
        label: "=",
        onSubmit: "&",
        options: "="
      },
      controller: controller,
      controllerAs: "ctrl",
      bindToController: true,
      templateUrl: "static/common/jumpToProjectChoice/jumpToProjectChoice.html",
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
      this.ctrl.onSubmit()(this.ctrl.option.projectID);
    }

  };
  
}());
