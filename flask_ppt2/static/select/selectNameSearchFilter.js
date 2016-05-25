(function() {
  
  "use strict";
  
  angular
    .module("app.select")
    .filter("nameSearch", NameSearch);
  
  NameSearch.$inject = ["projectListService"];
  
  function NameSearch(projectListService) {
    return function(projects, searchText, name_absLogic, finalID) {
      /* return everything if no search string */
      if (!searchText) return projects;

      var projlen = projects.length || 0;
      var st = (searchText || "").toLowerCase();
      var words = st.split(" ");
      var quoted_words = _.map(words, function(word){
        return "'" + word + "'";
      });
      
      var out = projects;
      var descriptionList = [];
      var sqlList = [];
      
      if (finalID == "0") {
        out = _.filter(out, function(project) {
          return project.finalID == "0";
        });
        descriptionList.push("final state='still alive'");
        sqlList.push("final=0");
      }
      
      if (name_absLogic == "phrase") {
        out = _.filter(out, function(project) {
          return (project.name + " " + project.abstract).toLowerCase().match(st);
        });
        descriptionList.push("name or abstract contains " + "'" + searchText + "'");
        sqlList.push("name_abs=" + searchText);
        sqlList.push("name_absLogic=phrase");
      }
      else if (name_absLogic == "and") {
        _.map(words, function(word) {
          out = _.filter(out, function(project) {
            return (project.name + " " + project.abstract).toLowerCase().match(this);
          }, word);
        });
        descriptionList.push("name or abstract contains " + quoted_words.join(" and "));
        sqlList.push("name_abs=" + searchText);
        sqlList.push("name_absLogic=and");
      }
      else if (name_absLogic == "or") {
        var matches = [], partial;
        _.map( words, function(word) {
          partial = _.filter(out, function(project) {
            return (project.name + " " + project.abstract).toLowerCase().match(this);
          }, word);
          matches = _.union(partial, matches);
        });
        out = _.intersection(out, matches);
        descriptionList.push("name or abstract contains " + quoted_words.join(" or "));
        sqlList.push("name_abs=" + searchText);
        sqlList.push("name_absLogic=or");
      }

      var projectIDs = _.map(out, function(project){
        return project.projectID;
      });
      projectListService.setList(projectIDs);
      projectListService.setDescription(descriptionList.join(", "));
      projectListService.setSql(sqlList.join("&"));
      
      return out;
    };
  };
  
}());
