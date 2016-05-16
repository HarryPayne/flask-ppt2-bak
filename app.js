(function() {
  
  /**
   *  @module PPT
   *  @desc   The parent module for the PPT application
   */
  
  angular
    .module("PPT", [
      "app.attributes",
      "app.comment",
      "app.common",
      "app.curate",
      "app.filter", 
      "app.header", 
      "app.login",
      "app.loginInjectorProvider",
      "app.manage",
      "app.modalConfirm",
      "app.project", 
      "app.report",
      "app.select", 
      "app.stateLocation",
      "app.title"
    ]);

}());
