var express = require('express');
var AWS = require("aws-sdk");
var dataChecks = require('../backend/checks');
var versionDebug = require('../test/VersionDebug');

//check to see if this is a valid hash
AWS.config.update({
    region: "us-east-1"
});

var docClient = new AWS.DynamoDB.DocumentClient();

//Insert data into an existing datastream
exports.insertData = function (hash, data, res) {
    //function insertData(hash, data, res) {
    //validate the input
    if (typeof hash === "undefined" || hash === null || typeof data === "undefined" || data === null || hash == "" || data == "") {
        console.error('Error not enough arguments ');
        res.render('insertData', { state: 'Error', hash: "", msg: "Not enough arguments" });
        return "-1";
    }
    
    if (!dataChecks.isAlphaNumeric(hash) || !dataChecks.isNumericInt(data)) {
        console.error('Error with INSERT DATA hash ' + hash);
        res.render('insertData', { state: 'Error', hash: hash, msg: 'Invalid hash' });
        return "-1";
    }
    

    var paramsStream = {
        TableName : versionDebug.iot_getStreamsTable(),
        KeyConditionExpression: "#hr = :idd",
        ExpressionAttributeNames: {
            "#hr": "hash"
        },
        ExpressionAttributeValues: {
            ":idd": hash
        }
    };
    
    docClient.query(paramsStream, function (err, querydata) {
        if (err) {
            console.error("Unable to query. Error:", JSON.stringify(err, null, 2));
        } else {
            console.log("Query succeeded.");
            if (querydata.Items.length != 1) {
                console.error('Error with INSERT DATA no hash ' + hash);
                res.render('insertData', { state: ' Error', hash: hash, msg: 'Invalid hash' });
                return "-1";
            }
            else {
                //if valid hash go ahead and insert the data
                //need a uuid of hash+datetime since dynamodb doesn't support composite primary keys
                //so use that instead of seperate columns for hash and data
                
                //get milliseconds from Unix epoch (00:00:00 UTC on 1 January 1970)
                var milliseconds = (new Date).getTime();
                var paramsIOTdata = {
                    TableName : versionDebug.iot_getDataTable(),
                    Item: {
                        "hash": hash,
                        "datetime" : milliseconds,
                        "data": data,
                    }
                };
                docClient.put(paramsIOTdata, function (err, querydataPut) {
                    if (err) {
                        console.error('Error with INSERT DATA hash ' + hash + 'and message ' + err);
                        res.render('insertData', { state: 'Error', hash: hash, msg: 'Internal error' });
                        return "-1";
                    } else {
                        console.log('Success with INSERT DATA hash ' + hash);
                        res.render('insertData', { state: 'Success', hash: hash, msg: data });
                        return hash;
                    }
                });
            }
        }
    });

};

//Insert data into an existing datastream
exports.resetData = function (hash, res) {
    //function insertData(hash, data, res) {
    //validate the input
    if (typeof hash === "undefined" || hash === null || hash == "") {
        console.error('Error not enough arguments ');
        res.render('resetData', { state: 'Error', hash: "", msg: "Not enought arguments" });
        return "-1";
    }
    
    if (!dataChecks.isAlphaNumeric(hash)) {
        console.error('Error with rest DATA hash ' + hash);
        res.render('resetData', { state: 'Error', hash: hash, msg: "Invalid hash" });
        return "-1";
    }
    
    //check to see if this is a valid hash
    AWS.config.update({
        region: "us-east-1"
    });
    
    var docClient = new AWS.DynamoDB.DocumentClient();
    var paramsStream = {
        TableName : versionDebug.iot_getStreamsTable(),
        KeyConditionExpression: "#hr = :idd",
        ExpressionAttributeNames: {
            "#hr": "hash"
        },
        ExpressionAttributeValues: {
            ":idd": hash
        }
    };
    
    docClient.query(paramsStream, function (err, querydata) {
        if (err) {
            console.error("Unable to query. Error:", JSON.stringify(err, null, 2));
        } else {
            console.log("Query for valid hash succeeded.");
            if (querydata.Items.length != 1) {
                console.error('Error with reset DATA no hash ' + hash);
                res.render('resetData', { state: 'Error', hash: hash, msg: "Invalid hash" });
                return "-1";
            }
            else {
                //if valid hash go ahead and delete the data
                //dynamo db won't let us delete all the data at once - need to go line by line :(
                //so first query to get all related rows (ie have the hash key)
                var paramsIOTdata = {
                    TableName : versionDebug.iot_getDataTable(),
                    KeyConditionExpression: "#hr = :idd",
                    ExpressionAttributeNames: {
                        "#hr": "hash"
                    },
                    ExpressionAttributeValues: {
                        ":idd": hash
                    }
                };
                
                docClient.query(paramsIOTdata, function (err, querydata) {
                    if (err) {
                        console.error("Unable to query for items to delete. Error:", JSON.stringify(err, null, 2));
                    } else {
                        //for each item, run a delete query
                        //and show a progress bar?. Don't want to flood the server with request for
                        //deleting a large stream
                        
                        //if not items:
                        if (querydata.Items.length == 0) {
                            console.error('No items to delete with hash ' + hash);
                            res.render('resetData', { state: 'Success', hash: hash, msg: "No items" });
                            return "-1";
                        }
                        
                        //using for rather than foreach so I have a counter index
                        for (var i = 0; i < querydata.Items.length; i++) {
                            var paramsdelIOTdata = {
                                TableName: versionDebug.iot_getDataTable(),
                                Key: {
                                    "hash": querydata.Items[i].hash,
                                    "datetime": querydata.Items[i].datetime,
                                },
                                idx: 0
                            };
                            
                            docClient.delete(paramsdelIOTdata, function (err, querydeldata) {
                                if (err) {
                                    console.error("Unable to delete item. Error JSON:", JSON.stringify(err, null, 2));
                                    res.render('resetData', { state: 'Error', hash: hash, msg: "Internal Error" });
                                    return "-1";
                                } else {
                                    paramsdelIOTdata.idx++;
                                    console.log("resetData succeeded: ", hash, " for item ", paramsdelIOTdata.idx, " of ", querydata.Items.length.toString());
                                }
                            });
                        }
                        
                        res.render('resetData', { state: 'Success', hash: hash, msg: "Deleted " + querydata.Items.length.toString() + " items" });
                        return "0";
                    }
                });
                
            }
        }
    });

};

