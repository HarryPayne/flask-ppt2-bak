(function() {
  
  "use strict";
  
  angular
    .module("app.select")
    .config(selectConfig);
  
  selectConfig.$inject = ["$stateProvider"];
  
  function selectConfig($stateProvider) {
    $stateProvider
      .state("select", {
        /** virtual root of Select tab states */
        url: "/select",
        controller: "Select",
        controllerAs: "select",
        templateUrl: "/static/select/select.html",
        data: {
          requiresLogin: false
        },
        onEnter: ["selectStateService", 
          function(selectStateService) {
            selectStateService.initService();
          }
        ]
      })
      .state("select.home", {
        url: "/home",
        templateUrl: "/static/select/templates/home.html"
      })
      .state("select.addProject", {
        url: "/addProject",
        templateUrl: "/static/select/templates/addProject.html",
        data: {
          requiresLogin: true
        },
        onEnter: ["attributesService", "projectDataService",
          function(attributesService, projectDataService) {
            if (!attributesService.getAllAttributes()) {
              /** then the list of attributes is empty. Get it */
              attributesService.updateAllAttributes()
                .then(projectDataService.getProjectData({projectID: 0}));
            }
            else {
              projectDataService.getProjectData({projectID: 0});
            }
          }
        ]
      });
  };
  
}());
