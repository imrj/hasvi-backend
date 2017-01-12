//#!/usr/bin/env node
//Master file for executing app
var debug = require('debug')('Hasvi-Backend');
var app = require('./Hasvi-Backend');

//set the port
app.set('port', process.env.PORT || 3000);

//and run the server
var server = app.listen(app.get('port'), function () {
    debug('Express server listening on port ' + server.address().port);
});
