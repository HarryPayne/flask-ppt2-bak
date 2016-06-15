(function() {
  
  /**
   *  @name projectDataDisplay
   *  @desc Render project data for a single database table. A header is 
   *        followed by rows in Bootstrap form-horizontal layout, even
   *        in view mode. This is the top of a pyramid of nested directives,
   *        and basically decides which data model to use, based on the table
   *        name passed in. Other attributes are passed down to data model
   *        specific directives. 
   *
   *        Call this directive from inside a form. The form elements are not
   *        rendered here. 
   * 
   *  The attributes for this directive are:
   * 
   *    datasource - a reference to an external function that supplies a data
   *      model to be rendered. In the case of the tables that are one-to-
   *      one with projectID, these items will be attributes of the project
   *      under consideration. In the case of the one-to-many tables, this will
   *      be the list of items (comments or dispositions) to be listed.
   *    detailDatasource - a reference to an external function that supplies
   *      a list of formly fields for the detail item. 
   *    detailIsSelected - a reference to a function that returns true when
   *      looping over the one-to-many items and landing on the one the user
   *      has selected.
   *    error - an object with error messages to be shown
   *    header - text for a header for the list of output rows
   *    hide - a reference to the external function to be run to exit from
   *      edit.detail mode back to edit mode.
   *    keys - a list of primary key attributes, used to identify the comment 
   *      or disposition to be edited in edit.detail mode
   *    mode - "view", "edit", or "edit.detail". Passed to the inner directive 
   *      to control the display of each row. In display mode pre-computed 
   *      display values are shown. In edit mode input "widgets" specific to 
   *      the format of each attribute are shown.
   *    onCancelClick - a reference to the external function to be run when the
   *      Cancel button is pressed.
   *    onSaveClick - a reference to the external function to be run when 
   *      the form  button is pressed.
   *    show - a reference to the external function to be run to edit an item
   *      in edit.detail mode.
   *    showSuccess - a reference to the external function to be run to decide
   *      whether a success message should be displayed.
   *    success - an object with success messages to be shown
   *    table - database table/project data category name
   */
  
  "use strict";
  
  angular
    .module("app.common")
    .directive("projectDataDisplay", ProjectDataDisplay);
  
  ProjectDataDisplay.$inject = ["$stateParams"]
  
  function ProjectDataDisplay($stateParams) {
    
    function controller() {
      //this.dataModel = getDataModelFromTable(this.table);
      this.cancel = cancel;
      this.details = details;
      this.detailsObj = detailsObj;
      this.flatten = flatten;
      this.form;
      this.hasAValue = hasAValue;
      this.hasCancel = hasCancel;
      this.hideDetails = hideDetails;
      this.isSelected = isSelected;
      this.save = save;
      this.saveDetails = saveDetails;
      //this.selectedKeys = typeof keys == "function" ? keys() : [];
      this.showDetails = showDetails;
      this.stateParams = $stateParams;
    }
    
    return {
      restrict: "EA",
      scope: {
        datasource: "=",
        detailDatasource: "&",
        detailIsSelected: "&",
        error: "=",
        fields: "=",
        header: "=",
        hide: "&",
        keys: "=",
        mode: "=",
        onCancelClick: "&",
        onSaveClick: "&",
        show: "&",
        showSuccess: "&",
        success: "=",
        table: "="
      },
      controller: controller,
      controllerAs: "ctrl",
      bindToController: true,
      link: function(scope, element, attributes, ctrl) {
        scope.submit = ctrl.save;
        ctrl.form = scope.$parent.projectForm;
      },
      templateUrl: getTemplateForDataModel
    };

    /**
     * @name cancel
     * @desc Call the function referred to by the onCancelClick attribute
     *        function, which is expected to navigate away to another state.
     */
    function cancel() {
      this.onCancelClick()();
    }

    /**
     *  @name details
     *  @desc Return the results from the detailDatasource attribute function
     *        as a list of attributes.
     *  @return {Object[]}
     */
    function details() {
      if (typeof this.attributes == "undefined" || this.attributes.length == 0) {
        var attributes = [];
        _.each(this.detailDatasource(), function(attr) {
          if (attr.computed) {
            return;
          }
          if (attr.format.substring(0, "child_for_".length) == "child_for_") {
            return;
          }
          if (attr.name == "commentID") {
            return;
          };
          attributes.push(attr);
        });
        this.attributes = attributes;
      }
      return this.attributes;
    }

    /**
     *  @name detailsObj
     *  @desc Return the results from the detailDatasource attribute function
     *        as an object with attribute name as the key, and attributes as
     *        the values.
     * @return {Object}
     */
    function detailsObj(name) {
      if (typeof this.attributesObj == "undefined" || Object.keys(this.attributesObj).length == 0) {
        var attributesObj = new Object;
        _.each(this.detailDatasource(), function(attr) {
          attributesObj[attr.name] = attr;
        });
        this.attributesObj = attributesObj;
      }
      if (name in this.attributesObj) {
        return this.attributesObj[name];
      }
    }

    /**
     * @name flatten
     * @desc Flatten the data for one choice of sub-object by assigning those 
     *       values to this.datasource. Parameters specify which list of
     *       many-to-one items with respect to a project, and which item in
     *       that list, by index is to be flattened.
     * @param {string} list_name    The name of the attribute in datasource()
     *                              chosen for flattening ("comments", or 
     *                              "dispositions").
     * @param {number} index        The index of the selected item.
     */
    function flatten(list_name, index) {
      var selected = this.datasource[list_name][index];
      _.each(Object.keys(selected), function(key) {
        if (key == "$$hashKey") return;
        this[key] = selected[key];
      }, this.datasource);
      return this.datasource;
    }

    /**
     *  @name getDataModelFromTable
     *  @desc return data model to use based the table directive option. (And
     *        knowledge of the database. Not considering that a problem right
     *        now.)
     *  @param {string} table - table name
     *  @return {string} ("one"||"comments"||"dispositions")
     */
    function getDataModelFromTable(table) {
      var oneToOneTables = ["'description'", "'portfolio'", "'project'"];
      if (_.contains(oneToOneTables, table)) {
        return "one";
      }
      else if (table == "'comment'") {
        return "comments";
      }
      else if (table == "'disposition'") {
        return "dispositions";
      }
    }

    /**
     * @name getTemplateForDataModel
     * @desc Return the templateUrl appropriate for the table specified by the
     *       table attribute. 
     * @param 
     */
    function getTemplateForDataModel(element, attributes) {
      var model = getDataModelFromTable(attributes.table);
      if (model == "one") {
        return "static/common/projectDataDisplay/oneToOneDataModel.html";
      }
      else if (model == "comments") {
        return "static/common/projectDataDisplay/commentsDataModel.html";
      }
      else if (model == "dispositions") {
        return "static/common/projectDataDisplay/dispositionsDataModel.html";
      }
    }

    function getValueFromKey(key) {
      var value;
      if ("id" in key) {
        value = key.id;
      }
      else if ("value" in key) {
        if (typeof key.value == "number") {
          value = key.value;
        }
        else if (typeof key.value == "string") {
          value = parseInt(key.value);
        }
        else if ("id" in key.value) {
          value = key.value.id;
        }
      }
      return value;
    }
    
    /**
     *  @name hasAValue
     *  @desc Call this function to determine whether the attribute has a value.
     *        In view mode, only project attributes that have a value are listed.
     */
    function hasAValue(attr) {
      if ("value" in attr) {
        if (typeof attr.value == "string") {
          if (attr.value != "") {
            return true;
          }
        } 
        else if (typeof attr.value == "object" && Boolean(attr.value) && "id" in attr.value) {
          if (!_.isArray(attr.value)) {
            if (Boolean(attr.value.desc) && attr.value.id != null  && attr.value != "" && attr.value != []) {
              return true;
            }
          }
          else if (attr.value.length) {
            return true
          }
          return false;
        }
        else if (attr.value != null && attr.value != "" && attr.value != []) {
          return true;
        }
      }
      return false;
    }

    /**
     * @name cancel
     * @desc Return the truth of the statement "this directive has a value for
     *        the onCancelClick attribute function."
     */
    function hasCancel() {
      return (typeof this.onCancelClick() != "undefined");
    }

    /**
     *  @name hideDetails
     *  @desc Call the function set in the directive "hide" option, which hides
     *        the edit.details view (and clears the form).
     * @param {string} table - the name of the table being updated
     * @param (Object[]) keys - a list of primary key attribute objects, sent
     *        to identify the database entry to be updated
     */
    function hideDetails(table, keys) {
      this.hide()(table, keys)
    }

    /**
     * @name isSelected
     * @desc Return the truth of the statement "this is the item you want to 
     *        work on." The primary key values of the item are compared with
     *        the stateParam values for each key.
     */
    function isSelected(table_name, index) {
      if (typeof index == "undefined" || 
          typeof this.keys == "undefined" || 
          this.keys.length == 0 ||
          this.datasource == "undefined" ||
          this.datasource.length == 0) {
        return false;
      }
      var selected = false;
      var item = this.datasource[table_name][index];
      if (typeof item != "undefined") {
        _.each(this.keys, function(key){
          var state_value = this.stateParams[key];
          var item_value = item[key].toString();
          if ((typeof state_value != "undefined" 
               && typeof item_value != "undefined" 
               && state_value == item_value)) {
            selected =  true;
          }
          else {
            selected = false;
          }
        }, this);
      }
      // If this is the one, flatten the data source
      if (selected) {
        this.flatten(table_name, index);
      }
      return selected;
    }

    /**
     *  @name save
     *  @desc When the form wrapping the directive is submitted, call the 
     *        function specified by the onSaveClick parameter
     */
    function save(table, keys) {
      this.onSaveClick()(table, keys);
    }

    function saveDetails(table, keys) {
      this.onSaveClick()(table, keys);
    }

    /**
     *  @name showDetails
     *  @desc Call the function set in the directive "show" option, which shows
     *        the edit.details view.
     * @param {string} table - the name of the table being updated
     * @param (Object[]) keys - a list of primary key attribute objects, sent
     *        to identify the database entry to be updated
     */
    function showDetails(table, keys) {
      this.show()(table, keys);
    }

  }
  
}());
