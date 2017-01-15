var express = require('express');
var AWS = require("aws-sdk");
var dataChecks = require('../util/checks');
var d3 = require("d3");
var jsdom = require("jsdom");
//var fabric = require('fabric').fabric;
var versionDebug = require('../util/VersionDebug');

//Create the dynamodb client
AWS.config.update({
    region: process.env.awsregion
});
var docClient = new AWS.DynamoDB.DocumentClient();

//Given the shortURL, genertate a view
exports.viewData = function (shortURL, username, res, req) {
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

    //var paramsViewQuery = {
    //    TableName : versionDebug.iot_getViewsTable(),
    //    KeyConditionExpression: "#hr = :idd",
    //    ExpressionAttributeNames: {
    //        "#hr": "subURL",
    //    },
    //    ExpressionAttributeValues: {
    //        ":idd": shortURLName,
    //    }
    //};

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
            else {
                //query streams table to ensure data stream exists and grab baseTime
                var paramsStreamQuery = {
                    TableName: versionDebug.iot_getStreamsTable(),
                    KeyConditionExpression: "#hr = :idd",
                    ExpressionAttributeNames: {
                        "#hr": "hash"
                    },
                    ExpressionAttributeValues: {
                        ":idd": queryViewData.Items[0].hash
                    }
                };

                docClient.query(paramsStreamQuery, function (err, querystreamdata) {
                    if (err) {
                        if (!versionDebug.iot_onAWS()) { console.error("Unable to query. Error:", JSON.stringify(err, null, 2)); }
                    } else {
                        //check the backend datastream exists
                        if (querystreamdata.Items.length != 1) {
                            if (!versionDebug.iot_onAWS()) { console.error('Error with view no backend data ' + shortURLName); }
                            //res.render('view', { shortURL: 'Error bad url' });
                            res.render('view', { shortURL: shortURLName, error: "Source data does not exist" });
                            return "-1";
                        }
                        //query the database for all values associated with the above hash
                        //taking into account the baseTime
                        var paramsIOTdata = {
                            TableName: versionDebug.iot_getDataTable(),
                            KeyConditionExpression: "#hr = :idd and #dd > :basett",
                            ExpressionAttributeNames: {
                                "#hr": "hash",
                                "#dd": "datetime"
                            },
                            ExpressionAttributeValues: {
                                ":idd": queryViewData.Items[0].hash,
                                ":basett": querystreamdata.Items[0].baseTime
                            }
                        };

                        docClient.query(paramsIOTdata, function (err, queryIOTdata) {
                            if (err) {
                                if (!versionDebug.iot_onAWS()) { console.error("Unable to query for items to delete. Error:", JSON.stringify(err, null, 2)); }
                                res.render('view', { shortURL: shortURLName, error: "Internal Error" });
                                return "-1";
                            }
                            //check the file extension matches the database, html doesn't need an extension though
                            else if (queryViewData.Items[0].type != shortURLExt && shortURLExt != 'html' && queryViewData.Items[0].type != 'chartjs') {
                                res.status(404).send('404');
                                return "-1";
                            }
                            //check there's actually data to show
                            if (queryIOTdata.Items.length == 0) {
                                if (!versionDebug.iot_onAWS()) { console.error("No items in view to show"); }
                                res.render('view', { shortURL: shortURLName, error: "No data for this url" });
                                return "-1";
                            }
                            else {
                                //note sorting by date is performed automatically due to table having timestamp
                                //as the sort key

                                //time formatting http://stackoverflow.com/questions/10645994/node-js-how-to-format-a-date-string-in-utc
                                //return a csv file
                                if (queryViewData.Items[0].type == 'csv') {
                                    //format as csv
                                    var csvoutput = "DateTime(" + dateCompensateTimezoneString(queryViewData.Items[0]) + "), Value\n";
                                    for (var i = 0; i < queryIOTdata.Items.length; i++) {
                                        var strdate = new Date(queryIOTdata.Items[i].datetime + dateCompensateTimezone(queryViewData.Items[0])).toISOString().replace(/T/, ' ').replace(/\..+/, '');
                                        //var strdate = dateCompensateTimezone(queryViewData.Items[0], queryIOTdata.Items[i].datetime).toISOString().replace(/T/, ' ').replace(/\..+/, '')
                                        csvoutput += strdate + "," + queryIOTdata.Items[i].data + "\r\n";
                                    }

                                    //and send as downloadable file
                                    //res.setHeader('Content-disposition', 'attachment; filename=data.csv');
                                    res.set('Content-Type', 'text/csv');
                                    res.status(200).send(csvoutput);
                                    return "0";
                                }
                                //return pre-formatted page for angular-chart.js
                                else if (queryViewData.Items[0].type == 'chartjs') {
                                    //format the strings
                                    var numstring = "[";
                                    var datestring = "[";
                                    var mindate = 999999999999999999999999999999;
                                    var maxdate = 0;
                                    for (var i = 0; i < queryIOTdata.Items.length; i++) {
                                        numstring += "" + queryIOTdata.Items[i].data + ", ";
                                        var strdate = new Date(queryIOTdata.Items[i].datetime + dateCompensateTimezone(queryViewData.Items[0])).toISOString().replace(/T/, ' ').replace(/\..+/, '');
                                        datestring += "\"" + strdate + "\", ";
                                        if (queryIOTdata.Items[i].datetime < mindate)
                                            mindate = queryIOTdata.Items[i].datetime;
                                        if (queryIOTdata.Items[i].datetime > maxdate)
                                            maxdate = queryIOTdata.Items[i].datetime;
                                    }
                                    numstring = numstring.substring(0, numstring.length - 2);
                                    numstring += "]";
                                    datestring = datestring.substring(0, datestring.length - 2);
                                    datestring += "]";
                                    //figure out the time scale - minutes, hours, days, months
                                    //less than 30 min, round to min
                                    if (maxdate - mindate < 1000 * 60 * 30) {
                                        mindate = Math.floor(mindate / (1000 * 60 * 1)) * 1000 * 60 * 1;
                                        maxdate = Math.ceil(maxdate / (1000 * 60 * 1)) * 1000 * 60 * 1;
                                    }
                                    //less than 180min, so round to 10's of minutes
                                    else if (maxdate - mindate < 1000 * 60 * 180) {
                                        mindate = Math.floor(mindate / (1000 * 60 * 10)) * 1000 * 60 * 10;
                                        maxdate = Math.ceil(maxdate / (1000 * 60 * 10)) * 1000 * 60 * 10;
                                    }
                                    //less than 72 hours, round to hours
                                    else if (maxdate - mindate < 1000 * 60 * 60 * 72) {
                                        mindate = Math.floor(mindate / (1000 * 60 * 60)) * 1000 * 60 * 60;
                                        maxdate = Math.ceil(maxdate / (1000 * 60 * 60)) * 1000 * 60 * 60;
                                    }
                                    //less than 30 days, round to days
                                    else if (maxdate - mindate < 1000 * 60 * 60 * 24 * 30) {
                                        mindate = Math.floor(mindate / (1000 * 60 * 60 * 24)) * 1000 * 60 * 60 * 24;
                                        maxdate = Math.ceil(maxdate / (1000 * 60 * 60 * 24)) * 1000 * 60 * 60 * 24;
                                    }
                                    //less than 90 days, round to months (else)
                                    else {
                                        //var tmpmindate = new Date(mindate).;
                                        //var tmpmaxdate = new Date(maxdate);
                                        //mindate = Math.floor(tmpmindate.) * 1000 * 60 * 60 * 24;
                                        //maxdate = Math.ceil(maxdate / (1000 * 60 * 60 * 24)) * 1000 * 60 * 60 * 24;
                                    }
                                    var strmindate = new Date(mindate + dateCompensateTimezone(queryViewData.Items[0])).toISOString().replace(/T/, ' ').replace(/\..+/, '');
                                    var strmaxdate = new Date(maxdate + dateCompensateTimezone(queryViewData.Items[0])).toISOString().replace(/T/, ' ').replace(/\..+/, '');

                                    //var ts = moment(queryIOTdata.Items[i].datetime);
                                    res.render('chartjs', { labels: datestring, datalabel: shortURLName, data: numstring, mindate: strmindate, maxdate: strmaxdate, tz: dateCompensateTimezoneString(queryViewData.Items[0]) });
                                    return "0";
                                }
                                //return a html file (basic table)
                                else if (queryViewData.Items[0].type == 'html') {
                                    var htmloutput = "<tr><th>DateTime(" + dateCompensateTimezoneString(queryViewData.Items[0]) + ")</th><th>Value</th></tr>";
                                    for (var i = 0; i < queryIOTdata.Items.length; i++) {
                                        var strdate = new Date(queryIOTdata.Items[i].datetime + dateCompensateTimezone(queryViewData.Items[0])).toISOString().replace(/T/, ' ').replace(/\..+/, '')
                                        htmloutput += "<tr><td>" + strdate + "</td><td>" + queryIOTdata.Items[i].data + "</td></tr>\r\n";
                                    }

                                    res.render('htmlOutput', { rows: htmloutput });
                                    return "0";
                                }

                                //return a svg (or png) plot using d3
                                else if (queryViewData.Items[0].type == 'svg' || queryViewData.Items[0].type == 'png') {
                                    html = '<!doctype html><html></html>'
                                    var document = jsdom.jsdom(html)

                                    //data array
                                    var dataFormatted = [];

                                    for (var i = 0; i < queryIOTdata.Items.length; i++) {
                                        //data.push(parseInt(queryIOTdata.Items[i].data));
                                        //var strdate = new Date(queryIOTdata.Items[i].datetime).toISOString().replace(/T/, ' ').replace(/\..+/, '');

                                        var dd = {};
                                        dd.datetime = new Date(queryIOTdata.Items[i].datetime + dateCompensateTimezone(queryViewData.Items[0]));
                                        dd.value = parseInt(queryIOTdata.Items[i].data);
                                        dataFormatted.push(dd);
                                    }

                                    //scaling
                                    var margin = { top: 20, right: 20, bottom: 110, left: 40 },
                                        width = 700 - margin.left - margin.right,
                                        height = 450 - margin.top - margin.bottom;

                                    var date_format = d3.time.format.utc('%d/%m/%Y');
                                    var time_format = d3.time.format.utc('%H:%M:%S');

                                    //the canvas
                                    var svg = d3.select(document.body).append("svg");
                                    var canvas = svg.attr("width", width + margin.left + margin.right)
                                        .attr("height", height + margin.top + margin.bottom)
                                        .append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")")
                                        .attr("font-family", "sans-serif")
                                        .attr("font-size", "10px")
                                        .attr("fill", "none")
                                        .attr("stroke", "#000")
                                        .attr("shape-rendering", "crispEdges");

                                    //css styles
                                    //var styles = svg.append("defs").append("style").attr("type", "text/css");
                                    //styles.text("<![CDATA[.axis {font: 10px sans-serif;}\n.axis path, .axis line {fill: none; stroke: #000; shape-rendering: crispEdges;}]]>");

                                    //axes
                                    var x = d3.time.scale.utc().range([0, width])
                                        .domain(d3.extent(dataFormatted.map(function (dd) { return dd.datetime; }))).nice();
                                    var y = d3.scale.linear().range([height, 0])
                                        .domain([d3.min(dataFormatted.map(function (dd) { return dd.value; })), d3.max(dataFormatted.map(function (dd) { return dd.value; }))]).nice();

                                    var xDateAxis = d3.svg.axis().scale(x).tickFormat(date_format);
                                    var xTimeAxis = d3.svg.axis().scale(x).tickFormat(time_format);
                                    var yAxis = d3.svg.axis().scale(y).orient("left").ticks(10, "");

                                    //line plot points
                                    var line = d3.svg.line()
                                        //.interpolate("basis")
                                        .x(function (dd) { return x(dd.datetime); })
                                        .y(function (dd) { return y(dd.value); });

                                    //add axes to canvas. Note 2 axes - one for date, the other for time
                                    //http://localhost:1337/views/admin/longtest.svg
                                    //http://localhost:1337/views/admin/longtestpng.png to test
                                    canvas.append("g")
                                        .attr("class", "axis")
                                        .attr("transform", "translate(0," + height + ")")
                                        .call(xDateAxis)
                                        .selectAll("text")
                                        .style("text-anchor", "end")
                                        .attr("dx", "-0.8em")
                                        .attr("dy", "-1em")
                                        .attr("transform", "rotate(-90)")
                                        .attr("fill", "#000")
                                        .attr("stroke", "none");
                                    canvas.append("g")
                                        .attr("class", "axis")
                                        .attr("transform", "translate(0," + height + ")")
                                        .call(xTimeAxis)
                                        .selectAll("text")
                                        .style("text-anchor", "end")
                                        .attr("dx", "-0.8em")
                                        .attr("dy", "0em")
                                        .attr("transform", "rotate(-90)")
                                        .attr("fill", "#000")
                                        .attr("stroke", "none");

                                    canvas.append("g")
                                        .attr("class", "axis")
                                        .call(yAxis)
                                        .selectAll("text")
                                        .attr("fill", "#000")
                                        .attr("stroke", "none");

                                    //add data points to canvas
                                    canvas.append("path")
                                        .attr("class", "line")
                                        .style("stroke", "steelblue")
                                        .style("stroke-width", "1")
                                        .style("fill", "none")
                                        .attr("d", line(dataFormatted))

                                    //add final svg tags
                                    var html = svg
                                        .attr("title", "svg Plot")
                                        .attr("version", 1.1)
                                        .attr("xmlns", "http://www.w3.org/2000/svg")
                                        .node().outerHTML;

                                    //if svg, then send it
                                    if (queryViewData.Items[0].type == 'svg') {
                                        res.set('Content-Type', 'image/svg+xml');
                                        res.status(200).send(html);
                                        return "0";
                                        //res.render('svgOutput', { svgstuff: svg.node().outerHTML });
                                    }
                                    //if png, need to render to canvas then convert to png
                                    //else if (queryViewData.Items[0].type == 'png') {
                                    //    var canvas = new fabric.createCanvasForNode(700, 460);

                                    //    fabric.loadSVGFromString(html, function (objects, options) {
                                    //        var obj = new fabric.PathGroup(objects, options);
                                    //        canvas.add(obj);
                                    //        canvas.renderAll();
                                    //        var stream = canvas.createPNGStream();

                                    //        //res.setHeader('Content-disposition', 'attachment; filename=data.png');
                                    //        res.set('Content-Type', 'image/png');
                                    //        stream.pipe(res);
                                    //        return "0";
                                    //    });
                                    //}
                                }
                            }
                        });
                    }
                });
            }
        }
    });
}

//Helper function to take into account timezones
//We're working in millisec
function dateCompensateTimezone(queryViewDataItems) {
    if (typeof queryViewDataItems.timezone === "undefined" || queryViewDataItems.timezone === null || parseInt(queryViewDataItems.timezone) == 0) {
        return 0;
    }
    else {
        return parseInt(queryViewDataItems.timezone) * 3600 * 1000;
    }
}

function dateCompensateTimezoneString(queryViewDataItems) {
    if (typeof queryViewDataItems.timezone === "undefined" || queryViewDataItems.timezone === null || parseInt(queryViewDataItems.timezone) == 0) {
        return "UTC";
    }
    else {
        if (parseInt(queryViewDataItems.timezone) > 0) {
            return "UTC +" + queryViewDataItems.timezone;
        }
        else {
            return "UTC " + queryViewDataItems.timezone;
        }
    }
}