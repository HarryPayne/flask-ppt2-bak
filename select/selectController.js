(function() {
  
  /**
   *  @name Select
   *  @desc Controller for the Select tab states
   * @requires ui-router
   * @requires attributesService
   * @requires loginStateService
   * @requires modalConfirmService
   * @requires projectDataService
   * @requires projectListService
   * @requires selectStateService
   */

  "use strict";
  
  angular
    .module("app.select")
    .controller("Select", Select);
  
  Select.$inject = ["$scope", "$state", "attributesService", "loginStateService", 
                    "modalConfirmService", "projectDataService", "projectListService", 
                    "selectStateService"];
  
  function Select($scope, $state, attributesService, loginStateService, 
                  modalConfirmService, projectDataService, projectListService, 
                  selectStateService) {
    
    this.state = $state;
    
    this.as = attributesService;
    this.ds = projectDataService;
    this.logss = loginStateService;

    this.ls = projectListService;
    this.masterList = this.ls.getMasterList;
    this.jumpToProject = this.ls.jumpToProject;
    
    this.ss = selectStateService;
    this.selectState = selectStateService.getMasterList;
    
    $scope.$on("$stateChangeStart", checkForDirtyAddProjectForm);

    /**
     *  @name checkForDirtyAddProjectForm
     *  @desc A listener for $stateChangeStart to prompt for unsaved changes on
     *        the add project form. Parameters are standard for listeners to
     *        this event.
     */
    function checkForDirtyAddProjectForm(event, toState, toParams, fromState, fromParams) {
      projectDataService.success = "";
      if (fromState.name == "state.addProject" && $scope.addProject.$dirty) {
        event.preventDefault();

        var modalOptions = {
            closeText: "Cancel",
            actionText: "Continue",
            headerText: "Unsaved changes",
            bodyText: "You have unsaved changes. Press Continue to discard your changes and" 
                      + " navigate away, or press Cancel to stay on this page."
        };

        modalConfirmService.showModal({}, modalOptions).then(function (result) {
          $scope.addProject.$setPristine();
          $state.go(toState, toParams);
        });
      }
    }
  };
  
}());
