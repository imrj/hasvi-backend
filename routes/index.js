/*
 * GET home page.
 */
var express = require('express');
var inData = require('../backend/AWSInData');
var outData = require('../backend/ViewOutput');
var versionDebug = require('../util/VersionDebug');
var router = express.Router();

router.get('/', function (req, res) {
    //res.render('insertData', { state: 'Error bad token', token: token, msg: data });
    res.render('index', { version: versionDebug.iot_getVersion() });
});

//posting data to database
//http://localhost:1337/insertData?token=gjt75iehdjf7rhg893e3&data=42
//http://localhost:1337/insertData?token=9sk13nx7rghrlopqnuhk&data=42
router.get('/insertData', function (req, res) {
    var token = req.query.token;
    var data = req.query.data;

    inData.insertData(token, data, res);

});

router.post('/insertData', function (req, res) {
    var token = req.body.token;
    var data = req.body.data;

    var ret = inData.insertData(token, data, res);
});

//view a stream, given the ID
//http://localhost:1337/views/admin/TestRunnerCsv.csv
//http://localhost:1337/views/admin/testrunnersvg.svg
//http://localhost:1337/views/admin/play.svg
//http://localhost:1337/views/admin/TestRunnerHtml
//http://localhost:1337/views/admin/testRunnerPng.png
router.get('/views/:username/:id', function (req, res) {
    var shortURL = req.params.id;
    var username = req.params.username;

    //res.render('view', { token: shortURL });
    outData.viewData(shortURL, username, res, req);
});

module.exports = router;