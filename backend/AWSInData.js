var express = require('express');
var AWS = require("aws-sdk");
var dataChecks = require('../backend/checks');
var versionDebug = require('../test/VersionDebug');

//check to see if this is a valid hash
AWS.config.update({
    region: "ap-southeast-2"
});

var docClient = new AWS.DynamoDB.DocumentClient();

//Insert data into an existing datastream
exports.insertData = function (token, data, res) {
    //function insertData(token, data, res) {
    //validate the input
    if (typeof token === "undefined" || token === null || typeof data === "undefined" || data === null || token == "" || data == "") {
        if (!versionDebug.iot_onAWS()) { console.error('Error not enough arguments '); }
        res.render('insertData', { state: 'Error', token: "", msg: "Not enough arguments" });
        return "-1";
    }
    
    if (!dataChecks.isAlphaNumeric(token) || !dataChecks.isNumericInt(data)) {
        if (!versionDebug.iot_onAWS()) { console.error('Error with INSERT DATA token ' + token); }
        res.render('insertData', { state: 'Error', token: token, msg: 'Invalid token' });
        return "-1";
    }
    
    var paramsStreamQuery = {
        TableName : versionDebug.iot_getStreamsTable(),
        KeyConditionExpression: "#hr = :idd",
        ExpressionAttributeNames: {
            "#hr": "hash"
        },
        ExpressionAttributeValues: {
            ":idd": token
        }
    };
    
    //Get the relevant streams table entry
    docClient.query(paramsStreamQuery, function (err, querydata) {
        if (err) {
            if (!versionDebug.iot_onAWS()) { console.error("Unable to query. Error:", JSON.stringify(err, null, 2)); }
        } else {
            //console.log("Query succeeded.");
            if (querydata.Count != 1) {
                if (!versionDebug.iot_onAWS()) { console.error('Error with INSERT DATA no token ' + token); }
                res.render('insertData', { state: ' Error', token: token, msg: 'Invalid token' });
                return "-1";
            }
            else {
                //get milliseconds from Unix epoch (00:00:00 UTC on 1 January 1970)
                //prepare data structure for new insert
                var milliseconds = (new Date).getTime();
                var paramsIOTdata = {
                    TableName : versionDebug.iot_getDataTable(),
                    Item: {
                        "hash": token,
                        "datetime" : milliseconds,
                        "data": data,
                    }
                };
                
                //check time of last uploaded-item
                var LastUploadedItemparams = {
                    TableName : versionDebug.iot_getDataTable(),
                    Limit : 1,
                    ScanIndexForward: false,
                    KeyConditionExpression: "#hr = :idd",
                    ExpressionAttributeNames: {
                        "#hr": "hash"
                    },
                    ExpressionAttributeValues: {
                        ":idd": token
                    }
                };
                
                //check time of last uploaded-item
                docClient.query(LastUploadedItemparams, function (err, lastItemdata) {
                    if (err) {
                        if (!versionDebug.iot_onAWS()) { console.error("Unable to query. Error:", JSON.stringify(err, null, 2)); }
                    } else {
                        //check if the time-since-last-item-inserted is after the minRefresh threshold
                        if (lastItemdata.Count > 0 && lastItemdata.Items[0].datetime + 1000 * querydata.Items[0].minRefresh > milliseconds) {
                            //it's not ... send an error message to the user
                            if (!versionDebug.iot_onAWS()) { console.log('Fail with INSERT DATA token (minRefresh not ready) ' + token); }
                            res.render('insertData', { state: 'Error', token: token, msg: 'Min refresh time not expired' });
                            return "-1";
                        } else {
                            //check if there's enough room in this datastream (accounting for baseTime)
                            //don't return actual items, just the count of items
                            var SizeStream = {
                                TableName : versionDebug.iot_getDataTable(),
                                Select : "COUNT",
                                KeyConditionExpression: "#hr = :idd and #dd > :basett",
                                ExpressionAttributeNames: {
                                    "#hr": "hash",
                                    "#dd": "datetime"
                                },
                                ExpressionAttributeValues: {
                                    ":idd": token,
                                    ":basett": querydata.Items[0].baseTime
                                }
                            };
                            
                            //check if there's enough room in this datastream
                            docClient.query(SizeStream, function (err, sizedata) {
                                if (err) {
                                    if (!versionDebug.iot_onAWS()) { console.error("Unable to query. Error:", JSON.stringify(err, null, 2)); }
                                } else {
                                    if (sizedata.Count > 0) {
                                        for (var i = 0; i <= (sizedata.Count - querydata.Items[0].maxStreamLength); i++) {
                                            //trim datastream down by 
                                            if (!versionDebug.iot_onAWS()) { console.log("Having to trim down stream: ", token); }
                                            //query to find single item
                                            var ItemtoDeleteStream = {
                                                TableName : versionDebug.iot_getDataTable(),
                                                Limit : 1,
                                                KeyConditionExpression: "#hr = :idd and #dd > :basett",
                                                ExpressionAttributeNames: {
                                                    "#hr": "hash",
                                                    "#dd": "datetime"
                                                },
                                                ExpressionAttributeValues: {
                                                    ":idd": token,
                                                    ":basett": querydata.Items[0].baseTime
                                                }
                                            };
                                            docClient.query(ItemtoDeleteStream, function (err, toDeleteData) {
                                                if (err) {
                                                    if (!versionDebug.iot_onAWS()) { console.error("Unable to query. Error:", JSON.stringify(err, null, 2)); }
                                                } else {
                                                    //and delete it
                                                    var paramsdelIOTdata = {
                                                        TableName: versionDebug.iot_getDataTable(),
                                                        Key: {
                                                            "hash": toDeleteData.Items[0].hash,
                                                            "datetime": toDeleteData.Items[0].datetime,
                                                        },
                                                    };
                                                    
                                                    docClient.delete(paramsdelIOTdata, function (err, querydeldata) {
                                                        if (err) {
                                                            if (!versionDebug.iot_onAWS()) { console.error("Unable to trim item. Error JSON:", JSON.stringify(err, null, 2)); }
                                                            res.render('insertData', { state: 'Error', token: token, msg: "Error trimming" });
                                                            return "-1";
                                                        }
                                                    });
                                                }
                                            });
                                        }
                                    }
                                    
                                    //OK to insert
                                    docClient.put(paramsIOTdata, function (err, querydataPut) {
                                        if (err) {
                                            if (!versionDebug.iot_onAWS()) { console.error('Error with INSERT DATA token ' + token + 'and message ' + err); }
                                            res.render('insertData', { state: 'Error', token: token, msg: 'Internal error' });
                                            return "-1";
                                        } else {
                                            //tell the user if they're at or over the max length for their stream
                                            if (sizedata.Count >= querydata.Items[0].maxStreamLength) {
                                                if (!versionDebug.iot_onAWS()) { console.log('Success with INSERT DATA token (over limit) ' + token); }
                                                res.render('insertData', { state: 'Success over limit', token: token, msg: data });
                                                return token;
                                            }
                                            else if ((sizedata.Count - querydata.Items[0].maxStreamLength) == -1) {
                                                if (!versionDebug.iot_onAWS()) { console.log('Success with INSERT DATA token (at limit) ' + token); }
                                                res.render('insertData', { state: 'Success at limit', token: token, msg: data });
                                                return token;
                                            }
                                            else {
                                                if (!versionDebug.iot_onAWS()) { console.log('Success with INSERT DATA token ' + token); }
                                                res.render('insertData', { state: 'Success', token: token, msg: data });
                                                return token;
                                            }
                                        }
                                    });
                                }
                            });
                        }
                    }
                });
            }
        }
    });

};

//Reset a stream to blank. Doesn't actaully delete the data (AWS makes it too difficult)
//Instead updates the 'baseTime' in the streams table to the current datetime as the '0' time
exports.resetData = function (token, res) {
    //function insertData(token, data, res) {
    //validate the input
    if (typeof token === "undefined" || token === null || token == "") {
        if (!versionDebug.iot_onAWS()) { console.error('Error not enough arguments '); }
        res.render('resetData', { state: 'Error', token: "", msg: "Not enought arguments" });
        return "-1";
    }
    
    if (!dataChecks.isAlphaNumeric(token)) {
        if (!versionDebug.iot_onAWS()) { console.error('Error with rest DATA token ' + token); }
        res.render('resetData', { state: 'Error', token: token, msg: "Invalid token" });
        return "-1";
    }
    
    var docClient = new AWS.DynamoDB.DocumentClient();
    var paramsStreamQuery = {
        TableName : versionDebug.iot_getStreamsTable(),
        KeyConditionExpression: "#hr = :idd",
        ExpressionAttributeNames: {
            "#hr": "hash"
        },
        ExpressionAttributeValues: {
            ":idd": token
        }
    };
    
    docClient.query(paramsStreamQuery, function (err, querydata) {
        if (err) {
            if (!versionDebug.iot_onAWS()) { console.error("Unable to query. Error:", JSON.stringify(err, null, 2)); }
        } else {
            if (!versionDebug.iot_onAWS()) { console.log("Query for valid token succeeded."); }
            if (querydata.Items.length != 1) {
                if (!versionDebug.iot_onAWS()) { console.error('Error with reset DATA no token ' + token); }
                res.render('resetData', { state: 'Error', token: token, msg: "Invalid token" });
                return "-1";
            }
            else {
                //if valid token go ahead and reset the stream to a new base time
                var milliseconds = (new Date).getTime();
                var paramsStreamUpdate = {
                    TableName : versionDebug.iot_getStreamsTable(),
                    Key: {
                        "hash": token
                    },
                    AttributeUpdates: {
                    // The attributes to update (map of attribute name to AttributeValueUpdate)                       
                        baseTime: {
                            Action: 'PUT', // PUT (replace)
                            Value: milliseconds 
                        },
                    },
                };
                
                docClient.update(paramsStreamUpdate, function (err, querydata) {
                    if (err) {
                        if (!versionDebug.iot_onAWS()) { console.error("Unable reset data. Error:", JSON.stringify(err, null, 2)); }
                        res.render('resetData', { state: 'Error', token: token, msg: "Internal Error" });
                        return "-1";
                    } else {                       
                        res.render('resetData', { state: 'Success', token: token, msg: "Reset" });
                        return "0";
                    }

                });
            }
        }
    });

};

