(function() {
  
  "use strict";
  
  angular
    .module("app.title")
    .controller("Title", Title);
  
  Title.$inject = ["$rootScope", "$state", "projectListService", "stateLocationService"];
  
  function Title($rootScope, $state, projectListService, stateLocationService){
    var vm = this;
    
    this.masterList = projectListService.getMasterList;
    this.pageTitle = "PPT: Select";
    
    $rootScope.$on("$locationChangeSuccess", function(e, toState){
      var state = stateLocationService.getStateFromLocation();
      var tab = _.first(state.name.split("."));
      if (tab == "select") {
        vm.pageTitle = "PPT: Select";
      }
      else if (tab == "filter") {
        vm.pageTitle = "PPT: Filter Builder";
      }
      else if (tab == "report") {
        vm.pageTitle = "PPT: Report";
      }
      else if (tab == "project") {
        vm.pageTitle = state.params.projectID + ". " + vm.masterList().projectName;
      }  
      else if (tab == "comment") {
        vm.pageTitle = "PPT: Comments";
      }
      else if (tab == "curate") {
        vm.pageTitle = "PPT: Curate";
      }
      else if (tab == "manage") {
        vm.pageTitle = "PPT: Manage";
      }
      else {
        vm.pageTitle = "PPT: Select";
      }      
    });

  }

}());
