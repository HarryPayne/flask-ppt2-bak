// Karma configuration
// Generated on Sun Jun 19 2016 19:47:12 GMT-0400 (EDT)

module.exports = function(config) {
  config.set({

    // base path that will be used to resolve all patterns (eg. files, exclude)
    basePath: '',


    // frameworks to use
    // available frameworks: https://npmjs.org/browse/keyword/karma-adapter
    frameworks: ['jasmine'],


    // list of files / patterns to load in the browser
    files: [
      'vendor/jquery/dist/jquery.min.js',
      'vendor/jquery-ui/jquery-ui.min.js',
      'vendor/datatables/media/js/jquery.dataTables.min.js',
      'vendor/angular/angular.js',
      'vendor/angular-animate/angular-animate.js',
      'vendor/angular-datatables/dist/angular-datatables.js',
      'vendor/angular-datatables/dist/plugins/bootstrap/angular-datatables.bootstrap.min.js',
      'vendor/angular-resource/angular-resource.js',
      'vendor/angular-sanitize/angular-sanitize.js',
      'vendor/angular-touch/angular-touch.min.js',
      'vendor/angular-ui-date/dist/date.js',
      'vendor/bootstrap/dist/js/bootstrap.min.js',
      'vendor/angular-bootstrap/ui-bootstrap.min.js',
      'vendor/angular-bootstrap/ui-bootstrap-tpls.min.js',
      'vendor/angular-ui-router/release/angular-ui-router.min.js',
      'vendor/a0-angular-storage/dist/angular-storage.min.js',
      'vendor/angular-jwt/dist/angular-jwt.min.js',
      'vendor/underscore/underscore.js',
      'vendor/angular-readmore-master/js/angular-readmore.js',
      'vendor/datejs/build/date-en-US.js',
      'vendor/api-check/dist/api-check.min.js',
      'vendor/angular-formly/dist/formly.js',
      'vendor/angular-formly-templates-bootstrap/dist/angular-formly-templates-bootstrap.js',
      'vendor/moment/moment.js',
      'vendor/moment-range/dist/moment-range.js',
      'vendor/angular-moment/angular-moment.min.js',
      'app*.js',
      'attributes/*.js',
      'comment/*.js',
      'common/*.js',
      'curate/*.js',
      'filter/*.js',
      'header/*.js',
      'home/*.js',
      'login/*.js',
      'loginInjector/*.js',
      'manage/*.js',
      'modalConfirm/*.js',
      'project/*.js',
      'report/*.js',
      'select/*.js',
      'stateLocation/*.js',
      'title/*.js',
    ],


    // list of files to exclude
    exclude: [
    ],


    // preprocess matching files before serving them to the browser
    // available preprocessors: https://npmjs.org/browse/keyword/karma-preprocessor
    preprocessors: {
    },


    // test results reporter to use
    // possible values: 'dots', 'progress'
    // available reporters: https://npmjs.org/browse/keyword/karma-reporter
    reporters: ['progress'],


    // web server port
    port: 9876,


    // enable / disable colors in the output (reporters and logs)
    colors: true,


    // level of logging
    // possible values: config.LOG_DISABLE || config.LOG_ERROR || config.LOG_WARN || config.LOG_INFO || config.LOG_DEBUG
    logLevel: config.LOG_INFO,


    // enable / disable watching file and executing tests whenever any file changes
    autoWatch: true,


    // start these browsers
    // available browser launchers: https://npmjs.org/browse/keyword/karma-launcher
    browsers: ['Chrome'],


    // Continuous Integration mode
    // if true, Karma captures browsers, runs the tests and exits
    singleRun: false,

    // Concurrency level
    // how many browser should be started simultaneous
    concurrency: Infinity
  })
}
