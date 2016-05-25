(function() {
  
  /**
   *  @name projectListService
   *  @desc A factory for the service that maintains a list of project short
   *        descriptions. Each description consists of the values for project
   *        attributes projectID, name, description, and finalID.
   *
   *  The projectListService has a number of uses:
   *
   *    project navigation
   *      The service keeps track of the last project you looked at, and if you
   *      navigate away from the Project tab and come back you will see the 
   *      same project, without going back to the server again. So there is
   *      the concept of a "current project." At the start of the session the
   *      current project will be the one with the lowest projectID.
   *
   *      The (ordered) list of projects allows for stepping through the list
   *      and the concept of previous and next projects. At the start of a 
   *      session the next project will be the one with the second lowest
   *      projectID, and there will not be a previous project. This functionality
   *      is revealed by the Previous and Next tabs, and their appearance 
   *      changes according to whether there are prevous and next projects.
   *
   *    project selection
   *      Other services provide the ability for you to select a subset of all
   *      available projects. This service holds a list of selected projectIDs
   *      along with a human-readable description of the selection criteria
   *      and a http GET query string that records the actual metadata values.
   *
   *      This service allows other services to show you a report of all 
   *      selected services, work on selected projects one at a time, and to
   *      navigate through selected projects using the Previous and Next tabs,
   *      which will skip over projects not selected.
   *
   *      The Select tab functionality for selecting a project from a dropdown
   *      menu is built on the short description data. The search functionality
   *      there uses a filter on the same data. Final state is one of the
   *      attributes sent out from the backend just for this purpose.
   *
   *      The Filter Builder and Report tabs use the descriptions of the project
   *      selection criteria for restoring state, providing a basis for 
   *      modifying the criteria.
   */

  "use strict";
  
  angular
    .module("app.project")
    .factory("projectListService", ProjectListService);
    
  ProjectListService.$inject = ["$rootScope", "$http", "$state", "$stateParams", 
                                "$location", "$q"];
  
  function ProjectListService($rootScope, $http, $state, $stateParams, 
                              $location, $q) {

    /** service to be returned by this factory */
    var service = {
      allProjectsCount: allProjectsCount,
      getIDListFromAllProjects: getIDListFromAllProjects,
      getMasterList: getMasterList,
      getNextID: getNextID,
      getPreviousID: getPreviousID,
      getProjectID: getProjectID,
      getSelectedIds: getSelectedIds,
      getSelectedProjects: getSelectedProjects,
      getSql: getSql,
      hasNextID: hasNextID,
      hasPreviousID: hasPreviousID,
      hasProjects: hasProjects,
      initModel: initModel,
      jumpToProject: jumpToProject,
      jumpToProjectInList: jumpToProjectInList,
      resetList: resetList,
      RestoreState: RestoreState,
      SaveState: SaveState,
      selectedIdsCount: selectedIdsCount,
      setAllProjectResults: setAllProjectResults,
      setDescription: setDescription,
      setList: setList,
      setProjectID: setProjectID,
      setSql: setSql,
      updateAllProjects: updateAllProjects
    };
  
    service.RestoreState();
    if (typeof(service.masterList) == "undefined") {
      service.initModel();
    } 

    $rootScope.$on("savestate", service.SaveState);
    $rootScope.$on("restorestate", service.RestoreState);
    
    return service;    

    /**
     *  @name allProjectsCount
     *  @desc Return the total number of available projects
     *  @returns {Number}
     */
    function allProjectsCount() {
      return service.getMasterList().allProjects.length;
    }

    /**
     *  @name getIDListFromAllProjects
     *  @desc Return the list of projectIDs for all available projects
     *  @returns {Number[]}
     */
    function getIDListFromAllProjects() {
      return _.map(service.masterList.allProjects, function(item) {
        return item.projectID;});
    };

    /**
     *  @name getMasterList
     *  @desc Getter for service.masterList
     *  @returns {Object}
     */
    function getMasterList() {
      return service.masterList;
    };

    /**
     *  @name getNextID
     *  @desc Getter for service.masterList.next
     *  @returns {Number} projectID
     */
    function getNextID() {
      return service.masterList.next;
    }

    /**
     *  @name getPreviousID
     *  @desc Getter for service.masterList.previous
     *  @returns {Number} projectID
     */
    function getPreviousID() {
      return service.masterList.previous;
    }

    /**
     *  @name getProjectID
     *  @desc Getter for service.masterList.projectID
     *  @returns {Number}
     */
    function getProjectID() {
      return service.masterList.projectID;
    }
    
    /**
     *  @name getSelectedIds
     *  @desc Getter for service.masterList.selectedIds
     *  @returns {Number[]}
     */
    function getSelectedIds() {
      return service.masterList.selectedIds;
    }

    /**
     *  @name getSelectedProjects
     *  @desc Return the brief descriptions for all of the selected projects
     *  @returns {Object[]}
     */
    function getSelectedProjects() {
      return service.masterList.selectedProjects;
    }

    /**
     *  @name getSql
     *  @desc Getter for service.masterList.sql
     *  @returns {string}
     */
    function getSql() {
      return service.masterList.sql;
    }
    
    
    function hasNextID() {
      return service.masterList.next != -1;
    }

    function hasPreviousID() {
      return service.masterList.previous != -1;
    }

    /**
     *  @name hasProjects
     *  @desc Return the validity of the statement "there are available 
     *        projects in service.masterList.allProjects"
     *  @returns {Boolean}
     */
    function hasProjects() {
      return Boolean(service.allProjectsCount() > 0);
    }
    
    /**
     *  @name initModel
     *  @desc Initialize the masterList object to make it ready for receiving
     *        data. The masterList holds the service state data, which gets
     *        saved as JSON to local storage when updated and restored when
     *        necessary.
     */
    function initModel() {
      service.masterList = {
        allProjects: [],
        description: "none",
        index: -1,
        next: -1,
        previous: -1,
        projectID: -1,
        projectName: "",
        selectedIds: [],
        selectedProjects: [],
        sql: ""
      };
    };

    /**
     *  @name jumpToProject
     *  @desc Go to the project.detail state for the given projectID. There
     *        must be a project to match the given projectID. Otherwise an 
     *        is raised.
     *  @param {Number|string} projectID - project identifier
     */
    function jumpToProject(projectID) {
      projectID = parseInt(projectID);
      var index = service.masterList.selectedIds.indexOf(projectID);
      /** if in selectedIds, make it the current project */
      if (service.masterList.selectedIds.indexOf(projectID) > -1) {
        service.jumpToProjectInList(projectID, service.masterList.selectedIds);
        return;
      }
      /** otherwise just go, if it exists */
      var projectIDlist = service.getIDListFromAllProjects();
      if (projectIDlist.indexOf(projectID) > -1) {
        service.jumpToProjectInList(projectID, projectIDlist);
        return;
      }
      alert("Can't find a project to display.");
    };
    
    
    /**
     *  @name jumpToProjectInList
     *  @desc Go to the project.detail state for the specified project and make
     *        it the current project
     */
    function jumpToProjectInList(projectID) {
      service.setProjectID(projectID);
      $state.go('project.detail', {projectID: projectID});
    };

    /**
     *  @name resetList
     *  @desc Reset the project list to the state where all projects are selected
     *        without forgetting which is the current project.
     */
    function resetList() {
      service.updateAllProjects(service.getProjectID())
        .then(function(projectID) {
          service.setDescription("none");
          service.setSql("");
          service.masterList.selectedProjects = service.masterList.allProjects;
          service.masterList.selectedIds = _.map(service.masterList.allProjects, function(project) {
            return project.projectID;
          });
        });
    }

    /**
     *  @name RestoreState
     *  @desc Restore the service.masterList object from client session storage
     */
    function RestoreState() {
      if (typeof sessionStorage.projectListService != "undefined") {
        service.masterList = angular.fromJson(sessionStorage.projectListService);
      }
    };

    /**
     *  @name SaveState
     *  @desc Save the service.masterList object in client session storage
     */
    function SaveState() {
        sessionStorage.projectListService = angular.toJson(service.masterList);
    };

    /**
     *  @name selectedIdsCount
     *  @desc Return the number of selected projects
     */
    function selectedIdsCount() {
      return service.masterList.selectedIds.length;
    }
    
    /**
     *  @name setAllProjectResults
     *  @desc Callback to save the response to a backend request for a complete
     *        list of project short descriptions sent by updateAllProjects().
     *  @param {Object} response - JSON response containing a list of project
     *        brief descriptions.
     *  @param {Number} [projectID=service.masterList.selectIds[0] || -1] - the 
     *        projectID to be configured as the current project.
     *
     *  The idea is that the list of available projects be loaded at the start 
     *  of a session an then re-used. But you, or some other user, might have
     *  added a new project that you want to work on. So you need to be able to
     *  update the list with out disrupting your workflow, which means not 
     *  changing the list of selected projects or the current project.
     */
    function setAllProjectResults(response, projectID) {
      service.masterList.allProjects = response.data.descriptions;
      if (typeof projectID == "undefined" || projectID < 0) {
        if (typeof service.masterList.selectIds != "undefined" && 
            service.masterList.selectIds.length) {
          projectID = service.masterList.selectIds[0];
          setProjectID(projectID);
        }
        else {
          var selectedIds = service.getIDListFromAllProjects();
          setProjectID(selectedIds[0], selectedIds);
        }
      }
    };
    
    /**
     *  @name setDescription
     *  @desc Setter for service.masterList.description
     *  @param {string} description - human readable description of the query
     *        used to select the current list of projects that is stored in 
     *        service.master.selectedIds
     */
    function setDescription(description) {
      service.masterList.description = description;
    };
    
    /**
     *  @name setList
     *  @desc Setter for service.masterList.selectedIds
     *  @param {Number[]} selectIds - a list of projectIDs to be saved as the
     *        list of selected projects.
     */
    function setList(selectedIds) {
      service.masterList.selectedIds = selectedIds;
      if (typeof selectedIds == "undefined") {
        var what_the_;
      }

      var index = selectedIds.indexOf(service.masterList.projectID);
      if (index < 0) {
        var projectID = selectedIds[0];
        service.setProjectID(projectID, selectedIds);
      }
      
      service.masterList.selectedProjects = _.filter(service.masterList.allProjects, function(project) {
        return _.contains(service.masterList.selectedIds, project.projectID);
      });
    }

    /**
     *  @name setProjectID
     *  @desc Setter for service.masterList.projectID and
     *        service.masterList.selectedIds
     *  @param {Number} projectID - the projectID to be configured as the 
     *        current project.
     *  @param {Number[]} [selectedIds=service.masterList.selectedIds] - a list 
     *        of projectIDs to be saved as the list of selected projects.
     */
    function setProjectID(projectID, selectedIds) {
      if (projectID) {
        projectID = parseInt(projectID);
        service.masterList.projectID = projectID;

        /** do we recognize this project? */
        var index = service.masterList.selectedIds.indexOf(projectID);
        if (projectID > 0 && index == -1) {

          /** then maybe this projectID is a mistake, but maybe we just added a 
           *  new project. Better check. */
          service.updateAllProjects(projectID)
            .then(function(projectID) {
              if (typeof selectedIds != "undefined") {
                service.masterList.selectedIds = selectedIds;
              }
              index = service.masterList.selectedIds.indexOf(projectID);
            }); 
        }

        if (index > -1) {
          service.masterList.index = index;
          if (index > 0) {
            service.masterList.previous = service.masterList.selectedIds[index-1];
          } 
          else {
            service.masterList.previous = -1;
          }
          if (index < service.masterList.selectedIds.length) {
            service.masterList.next = service.masterList.selectedIds[index+1];
          }
          else {
            service.masterList.next = -1;
          }
        }
        _.each(service.masterList.allProjects, function(proj){
          if (proj.projectID == projectID) {
            service.masterList.projectName = proj.name;
          }
        });
        
        service.masterList.selectedProjects = _.filter(service.masterList.allProjects, function(project) {
          return _.contains(service.masterList.selectedIds, project.projectID);
        });

      }
      service.SaveState();
    };

    /**
     *  @name setSql
     *  @desc Setter for service.masterList.sql
     *  @param {string} query_string - an http GET query_string to represent
     *        the actual SQL used to filter from all projects down to the
     *        selected projects.
     */
    function setSql(query_string) {
      service.masterList.sql = query_string;
    }
      
    /**
     *  @name updateAllProjects
     *  @desc Obtain the complete list of project brief descriptions from the
     *        back end and promise sending them to the setAllProjectResults
     *        callback function. Each brief description contains values for
     *        project attributes projectID, name, description, and finalID.
     *  @param {Number} [projectID] - projectID passed to the callback, which
     *        needs to be aware that it might be absent.
     */
    function updateAllProjects(projectID) {
      var deferred = $q.defer();
      $http.post('/getBriefDescriptions')
        .then(function(response) {
          service.setAllProjectResults(response, projectID);
          deferred.resolve(projectID);
        });
      return deferred.promise;
    };
    
  }
    
}());
