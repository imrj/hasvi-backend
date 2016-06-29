//Required libraries
var express = require('express');
var path = require('path');
var logger = require('morgan');
var bodyParser = require('body-parser');
var engine = require('express-dot-engine');
var versionDebug = require('./test/VersionDebug');

//The URL route events
var routes = require('./routes/index');

//create an express-based app
var app = express();

//view engine setup - using the "dot" engine
app.engine('dot', engine.__express);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'dot');

//Other node.js setup stuff
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

//Declare the URL routes and map to events
app.use('/', routes);
app.use('/insertData', routes);
app.use('/resetData', routes);
app.use('/views/:username/:id', routes);

// catch 404 and forward to error handler
//app.use(function (req, res, next) {
//    var err = new Error('Not Found');
//    err.status = 404;
//    next(err);
//});

// error handlers

// development error handler
// will print stacktrace
if (!versionDebug.iot_onAWS()) {
    app.use(function (err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err,
            version: versionDebug.iot_getVersion()
        });
    });
}
else {
    // production error handler
    // no stacktraces leaked to user
    app.use(function (err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: {},
            version: versionDebug.iot_getVersion()
        });
    });
}

//Export functions in this file
module.exports = app;