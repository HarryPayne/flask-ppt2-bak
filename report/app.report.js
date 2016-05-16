(function() {

  /**
   *  @module app.report
   *  @desc   a module for the Report tab of the application
   */  

  angular
    .module("app.report", [
        "ui.router",            /** angular-ui-router */
        "datatables",           /** angular-datatables, depends on jQuery DataTables */
        "datatables.bootstrap"  /** angular-datatables Bootstrap module */
      ]);
  
}());
