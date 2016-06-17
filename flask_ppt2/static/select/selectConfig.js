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
        ],
        resolve: {
          attributesPromise: ["attributesService", 
            function(attributesService) {
              // Make sure formlyFields and project list are available for init.
              return attributesService.getFormlyFieldObj();
            }
          ],
          projectListPromise: ["projectListService",
            function(projectListService) {
              return projectListService.getMasterList()
            }
          ]
        }

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
        }      });
  };
  
}());
