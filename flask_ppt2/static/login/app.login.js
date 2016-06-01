(function() {
  
  /**
   * @module app.login 
   * @desc  A module handling user login and logout. A request for login
   *        opens a Bootstrap modal window for gathering a username and
   *        password. User information comes back in a JSON web token.
   *        The login form is protected against csrf attacks.
   */
  angular
    .module("app.login", [
      "ngAnimate",
      "ui.bootstrap",
      "angular-storage",
      "angular-jwt"
    ]);
  
}());