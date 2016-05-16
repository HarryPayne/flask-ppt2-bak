(function() {
  
  "use strict";
  
  angular
    .module("app.comment")
    .config(commentConfig);
  
  commentConfig.$inject = ["$stateProvider"];

  function commentConfig($stateProvider) {
    $stateProvider
      .state("comment", {
        url: "/comment",
        templateUrl: "/static/comment/comment.html",
        controller: "Comment",
        controllerAs: "comment",
        data: {
          requiresLogin: true
        }
      });
  }
  
}());
