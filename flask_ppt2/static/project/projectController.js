(function() {
  
  /**
   *  @name Project
   *  @desc A controller for the states and views associated with the Project 
   *        tab. 
   */
  
  "use strict";
  
  angular
    .module("app.project")
    .controller("Project", Project);
  
  Project.$inject = ["$scope", "$state", "projectDataService", "projectListService", 
                     "attributesService", "modalConfirmService", "loginStateService",
                     "attributesPromise", "projectListPromise"];
  
  function Project($scope, $state, projectDataService, projectListService, 
                   attributesService, modalConfirmService, loginStateService,
                   attributesPromise, projectListPromise){
    
    this.as = attributesService;
    this.ds = projectDataService;
    this.ls = projectListService;
    this.log_s = loginStateService;
    this.projectListPromise = projectListPromise;
    this.fields = attributesPromise;

    this.changeMode = this.ds.changeMode;
    this.currentMode = projectDataService.currentMode;
    this.dateOptions = {changeYear: true, changeMonth: true};
    this.error = this.ds.server;
    this.formlyOptions = this.as.formlyOptions;
    this.getFormlyOptions = this.as.getFormlyOptions;
    this.jumpToAtachFile = projectDataService.jumpToAtachFile;
    this.jumpToAddForm = projectDataService.jumpToAddForm;
    this.masterList = this.ls.getMasterList;
    this.showDetails = this.ds.shotDetails;
    this.success = this.ds.success;
    this.viewUrl = projectDataService.viewUrl;

    /* angular-formly options for Bootstrap horizontal layout and for 
     * readonly display on the view page. */
    this.viewOptions = {
      formState: {
        horizontalLabelClass: 'col-sm-2',
        horizontalFieldClass: 'col-sm-10',
        readOnly: true
      }
    };
    this.editOptions = {
      formState: {
        horizontalLabelClass: 'col-sm-2',
        horizontalFieldClass: 'col-sm-10',
        readOnly: false
      }
    };

    $scope.$on("setProjectFormPristine", function() {
      if (typeof projectForm != "undefined") {
        $scope.projectForm.$setPristine(true);
      }
    });
    
    $scope.$on(["$stateChangeStart"], unsavedDataPopup);
    
    /**
     *  @name unsavedDataPopup
     *  @desc Open a popup and ask how to proceed in the case of attempting to 
     *        navigate away from one of the project edit sub-tabs when there 
     *        is unsaved data in the form. The  function is bound to the 
     *        $stateChangeStart event, and the calling sequence is that of a 
     *        handler for this event.
     *  @param {Object} event
     *  @param {Object} toState
     *  @param {Object} toParams
     *  @param {Object} fromState
     *  @param {Object} fromParams
     */
    function unsavedDataPopup(event, toState, toParams, fromState, fromParams) {
      projectDataService.success = "";
      if (typeof projectDataService.noCheck != "undefined") {
        $scope.projectForm.$setPristine(true);
        delete projectDataService.noCheck;
        //projectDataService.getProjectData(projectDataService.projectID); // forced discard
        //$state.go(toState, toParams);
      }
      
      /** if the "projectForm" project editing form has unsaved changes ... */
      if (typeof $scope.projectForm != "undefined" && $scope.projectForm.$dirty) {
        event.preventDefault();

        var modalOptions = {
            closeText: "Cancel",
            actionText: "Continue",
            headerText: "Unsaved changes",
            bodyText: "You have unsaved changes. Press Continue to discard your changes and" 
                      + " navigate away, or press Cancel to stay on this page."
        };

        /** Open a modal window that asks the question shown above as bodyText,
         *  and shows Continue and Cancel buttons for making a response. The
         *  promised response is passed to a callback function.
         */
        modalConfirmService.showModal({}, modalOptions).then(function (response) {
          $scope.projectForm.$setPristine(true);
          var target = toParams.projectID ? toParams.projectID : fromParams.projectID;
          projectDataService.getProjectData(target, toParams); // forced discard
          $state.go(toState, toParams);
        });
      }
    }
    
    /**
     *  @name unsavedChangesConfirmed
     *  @desc Callback to handle the user's choice to discard unsaved changes
     *        and navigate away with saving.The form is set back to the pristine
     *        state, form data is returned to the last saved state, and a state
     *        change for navigating away is started.
     *  @param {Object} response 
     */
    function unsavedChangesConfirmed(response) {
      $scope.projectForm.$setPristine(true);
      var target = toParams.projectID ? toParams.projectID : fromParams.projectID;
      projectDataService.getProjectData(target, toParams); // forced discard
      $state.go(toState, toParams);
    }
  };
  
}());
