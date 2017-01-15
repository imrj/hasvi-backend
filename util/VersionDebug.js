/*
 * This file is for getting the current version of the App and
 * setting production/debug var, so we know which DynamoDb tables
 * to use
 * use mode=PRODUCTION as the env var*/

var package = require('../package.json');

//are we on an WAS server? use onAWS=TRUE env var
exports.iot_onAWS = function () {
    if (process.env.onAWS == "TRUE") {
        return true;
    }
    else {
        return false;
    }
}

//are we on a production server? Use mode=PRODUCTION env var
exports.iot_isDebug = function () {
    if (process.env.mode == "PRODUCTION") {
        return false;
    }
    else {
        return true;
    }
};

//Get current version from json
exports.iot_getVersion = function () {
    if (process.env.mode == "PRODUCTION") {
        return String(package.version);
    }
    else {
        return String(package.version) + "-testing";
    }
};

exports.iot_getDataTable = function () {
    if (process.env.mode == "PRODUCTION") {
        return "IOTData2";
    }
    else {
        return "testing-IOTData2";
    }
};

exports.iot_getViewsTable = function () {
    if (process.env.mode == "PRODUCTION") {
        return "views";
    }
    else {
        return "testing-views";
    }
};

exports.iot_getStreamsTable = function () {
    if (process.env.mode == "PRODUCTION") {
        return "streams";
    }
    else {
        return "testing-streams";
    }
};