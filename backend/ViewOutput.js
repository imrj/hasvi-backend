var express = require('express');
var AWS = require("aws-sdk");
var async = require("async");

//Internal fiels to include
var versionDebug = require('../util/VersionDebug');
var tz = require('../util/timezoneCompensation');
var dataChecks = require('../util/checks');

//Output renderers
var csvOutput = require('./csvOutput');
var htmlOutput = require('./htmlOutput');
var chartJSOutput = require('./chartjsOutput');
var svgOutput = require('./svgOutput');

var docClient = null;

//Given the shortURL, genertate a view
exports.viewData = function (shortURL, username, res, req) {
    //Configure for current region, if required
    if (docClient === null) {
        AWS.config.update({
            region: process.env.awsregion
        });
        docClient = new AWS.DynamoDB.DocumentClient();
    }

    //validate the input
    if (typeof shortURL === "undefined" || shortURL === null || shortURL == "" || typeof username === "undefined" || username === null || username == "") {
        if (!versionDebug.iot_onAWS()) { console.error('Error in view not enough arguments'); }
        res.status(404).send('404');
        return "-1";
    }

    //split the url request into the filename and the file extension - both need to be checked
    var shortURLName = shortURL.split('.')[0];
    var shortURLExt = shortURL.split('.')[1];

    if (!dataChecks.isAlphaNumeric(shortURLName)) {
        if (!versionDebug.iot_onAWS()) { console.error('Error with view URL ' + shortURL); }
        res.status(404).send('404');
        return "-1";
    }

    var paramsViewQuery = {
        TableName: versionDebug.iot_getViewsTable(),
        IndexName: "username-subURL-index",
        KeyConditionExpression: "#hr = :idd and #us = :idx",
        ExpressionAttributeNames: {
            "#hr": "subURL",
            "#us": "username"
        },
        ExpressionAttributeValues: {
            ":idd": shortURLName,
            ":idx": username
        }
    };

    docClient.query(paramsViewQuery, function (err, queryViewData) {
        if (err) {
            if (!versionDebug.iot_onAWS()) { console.error("Unable to query. Error:", JSON.stringify(err, null, 2)); }
            res.status(404).send('404');
            return "-1";
        } else {
            //console.log("Query succeeded.");
            if (queryViewData.Items.length != 1) {
                if (!versionDebug.iot_onAWS()) { console.error('Error with view no URL ' + shortURLName); }
                //res.render('view', { shortURL: 'Error bad url' });
                res.status(404).send('404');
                return "-1";
            }
            //check the file extension matches the database, html or chartjs doesn't need an extension though
            else if (queryViewData.Items[0].type != shortURLExt && queryViewData.Items[0].type != 'html' && queryViewData.Items[0].type != 'chartjs') {
                res.status(404).send('404');
                return "-1";
            }
            else {
                //These 2 variables will hold the stream data from the 2 lists of tokens
                var retDataL = [];
                var retDataR = [];
                //These 2 variables will hold the stream names from the 2 lists of tokens
                var retDataNameL = [];
                var retDataNameR = [];
                //Queries to get and check all the data, then generate the visualisation
                async.series([
                    //Get stream names (will give exception if any datastreams are not the user's
                    function (callback) {
                        var paramsStreamQuery = {
                            TableName: versionDebug.iot_getStreamsTable(),
                            IndexName: "username-hash-index",
                            KeyConditionExpression: "#us = :idx",
                            ExpressionAttributeNames: {
                                "#us": "username"
                            },
                            ExpressionAttributeValues: {
                                ":idx": username
                            }
                        };

                        docClient.query(paramsStreamQuery, function (err, queryStreamdata) {
                            if (err) {
                                //if (!versionDebug.iot_onAWS()) { console.error("Unable to query. Error:", JSON.stringify(err, null, 2)); }
                                //res.render('view', { shortURL: shortURLName, error: "Not able to query data source" });
                                callback("Error");
                            }
                            else {
                                //we've got the stream names, now put them into retDataNameL and retDataNameR
                                for (index = 0; index < queryStreamdata.Items.length; ++index) {
                                    if (queryViewData.Items[0].tokensLeft != null) {
                                        for (ixL = 0; ixL < queryViewData.Items[0].tokensLeft.values.length; ++ixL) {
                                            if (queryViewData.Items[0].tokensLeft.values[ixL] == queryStreamdata.Items[index].hash) {
                                                retDataNameL.push(queryStreamdata.Items[index].name);
                                            }
                                        }
                                    }
                                    if (queryViewData.Items[0].tokensRight != null) {
                                        for (ixR = 0; ixR < queryViewData.Items[0].tokensRight.values.length; ++ixR) {
                                            if (queryViewData.Items[0].tokensRight.values[ixR] == queryStreamdata.Items[index].hash) {
                                                retDataNameR.push(queryStreamdata.Items[index].name);
                                            }
                                        }
                                    }
                                }
                                //if (!versionDebug.iot_onAWS()) { console.error('Done checkValidStream ' + item); }
                                callback(null);
                            }
                        });
                    },
                    //Get the data from the streams in queryViewData.Items[0].tokensLeft.values
                    function (callback) {
                        if (queryViewData.Items[0].tokensLeft != null) {
                            async.eachSeries(queryViewData.Items[0].tokensLeft.values, function getData(item, callback) {
                                var paramsStreamQuery = {
                                    TableName: versionDebug.iot_getDataTable(),
                                    KeyConditionExpression: "#hr = :idd",
                                    ExpressionAttributeNames: {
                                        "#hr": "hash"
                                    },
                                    ExpressionAttributeValues: {
                                        ":idd": item,
                                    }
                                };

                                docClient.query(paramsStreamQuery, function (err, queryIOTdata) {
                                    //if (!versionDebug.iot_onAWS()) { console.error('Done getDataL ' + item); }
                                    if (err) {
                                        if (!versionDebug.iot_onAWS()) { console.error("Unable to query. Error:", JSON.stringify(err, null, 2)); }
                                        //res.render('view', { shortURL: shortURLName, error: "Not able to query data source" });
                                        callback("Error");
                                    } else {
                                        retDataL.push(queryIOTdata.Items);
                                        callback(null);
                                    }
                                });
                            }, function (err) {
                                callback(err);
                            });
                        }
                        else {
                            callback(null);
                        }
                    },
                    //Get the data from the streams in queryViewData.Items[0].tokensRight.values
                    function (callback) {
                        if (queryViewData.Items[0].tokensRight != null) {
                            async.eachSeries(queryViewData.Items[0].tokensRight.values, function getData(item, callback) {
                                var paramsStreamQuery = {
                                    TableName: versionDebug.iot_getDataTable(),
                                    KeyConditionExpression: "#hr = :idd",
                                    ExpressionAttributeNames: {
                                        "#hr": "hash"
                                    },
                                    ExpressionAttributeValues: {
                                        ":idd": item,
                                    }
                                };

                                docClient.query(paramsStreamQuery, function (err, queryIOTdata) {
                                    //if (!versionDebug.iot_onAWS()) { console.error('Done getDataR ' + item); }
                                    if (err) {
                                        if (!versionDebug.iot_onAWS()) { console.error("Unable to query. Error:", JSON.stringify(err, null, 2)); }
                                        //res.render('view', { shortURL: shortURLName, error: "Not able to query data source" });
                                        callback("Error");
                                    } else {
                                        retDataR.push(queryIOTdata.Items);
                                        callback(null);
                                    }
                                });
                            }, function (err) {
                                callback(err);
                            });
                        }
                        else {
                            callback(null);
                        }
                    }],
                    // And when we've got all the data, start the output processing
                    function (err) {
                        //check for any errors from the 4 callback functions above
                        if (err) {
                            res.render('view', { shortURL: shortURLName, error: "Not able to query data source" });
                            return;
                        }
                        //check there's actually data to show
                        if (retDataR.length == 0 && retDataL.length == 0) {
                            if (!versionDebug.iot_onAWS()) { console.error("No items in view to show"); }
                            res.render('view', { shortURL: shortURLName, error: "No data for this url" });
                            return;
                        }
                        //check if any of the datastreams have data
                        var HasData = false;
                        for (datidx = 0; datidx < retDataR.length; ++datidx) {
                            if (retDataR[datidx].length != 0)
                                HasData = true;
                        }
                        for (datidx = 0; datidx < retDataL.length; ++datidx) {
                            if (retDataL[datidx].length != 0)
                                HasData = true;
                        }
                        if (!HasData) {
                            if (!versionDebug.iot_onAWS()) { console.error("No data in view to show"); }
                            res.render('view', { shortURL: shortURLName, error: "No datastream data for this url" });
                            return;
                        }

                        //All checks done, time to render

                        //if's it's a csv...
                        if (queryViewData.Items[0].type == 'csv') {
                            var csvoutput = csvOutput.csvView(retDataNameL, retDataNameR, retDataL, retDataR, tz.dateCompensateTimezone(queryViewData.Items[0]), tz.dateCompensateTimezoneString(queryViewData.Items[0]));
                            res.set('Content-Type', 'text/csv');
                            res.status(200).send(csvoutput);
                            return;
                        }
                        //return pre-formatted page for angular-chart.js
                        else if (queryViewData.Items[0].type == 'chartjs') {
                            var chtjs = chartJSOutput.chartjsView(retDataNameL, retDataNameR, retDataL, retDataR, tz.dateCompensateTimezone(queryViewData.Items[0]), tz.dateCompensateTimezoneString(queryViewData.Items[0]));
                            res.render('chartjs', { datasets: chtjs.dataset, tz: tz.dateCompensateTimezoneString(queryViewData.Items[0]) });
                            return;
                        }
                        //return a html file (basic table)
                        else if (queryViewData.Items[0].type == 'html') {
                            var htmloutput = htmlOutput.htmlView(retDataNameL, retDataNameR, retDataL, retDataR, tz.dateCompensateTimezone(queryViewData.Items[0]), tz.dateCompensateTimezoneString(queryViewData.Items[0]));
                            res.render('htmlOutput', { rows: htmloutput });
                            return;
                        }
                        //return a svg plot using d3
                        else if (queryViewData.Items[0].type == 'svg') {
                            var svgoutput = svgOutput.svgView(retDataNameL, retDataNameR, retDataL, retDataR, tz.dateCompensateTimezone(queryViewData.Items[0]), tz.dateCompensateTimezoneString(queryViewData.Items[0]));
                            res.set('Content-Type', 'image/svg+xml');
                            res.status(200).send(svgoutput);
                            return;
                        }
                        //else we don't know what the visualisation format is
                        else {
                            res.render('view', { shortURL: shortURLName, error: "Invalid view type" });
                            return;
                        }

                    }
                );
            }
        }
    });
}

