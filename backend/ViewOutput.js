var express = require('express');
//const crypto = require('crypto');
var AWS = require("aws-sdk");
var dataChecks = require('../backend/checks');
var d3 = require("d3");
var jsdom = require("jsdom");
//var Canvas = require('canvas');
var fabric = require('fabric').fabric;

//check to see if this is a valid view URL
AWS.config.update({
    //region: "ap-southeast-2"
    region: "us-east-1"
});

var docClient = new AWS.DynamoDB.DocumentClient();

//Given the shortURL, genertate a view
exports.viewData = function (shortURL, res, req) {
    //validate the input
    if (typeof shortURL === "undefined" || shortURL === null || shortURL == "") {
        console.error('Error in view not enough arguments');
        res.render('view', { shortURL: 'Error not enough arguments' });
        return "-1";
    }
    
    if (!dataChecks.isAlphaNumeric(shortURL)) {
        console.error('Error with view URL ' + shortURL);
        res.render('view', { shortURL: 'Error bad url' });
        return "-1";
    }
    
    
    var paramsStream = {
        TableName : "views",
        KeyConditionExpression: "#hr = :idd",
        ExpressionAttributeNames: {
            "#hr": "subURL"
        },
        ExpressionAttributeValues: {
            ":idd": shortURL
        }
    };
    
    docClient.query(paramsStream, function (err, querydata) {
        if (err) {
            console.error("Unable to query. Error:", JSON.stringify(err, null, 2));
        } else {
            console.log("Query succeeded.");
            if (querydata.Items.length != 1) {
                console.error('Error with view no URL ' + shortURL);
                //res.render('view', { shortURL: 'Error bad url' });
                res.sendStatus(404);
                return "-1";
            }
            else {
                //query the database for all values associated with the above hash
                //TODO: add datetime filtering here
                var paramsIOTdata = {
                    TableName : "IOTData2",
                    KeyConditionExpression: "#hr = :idd",
                    ExpressionAttributeNames: {
                        "#hr": "hash"
                    },
                    ExpressionAttributeValues: {
                        ":idd": querydata.Items[0].hash
                    }
                };
                
                docClient.query(paramsIOTdata, function (err, queryIOTdata) {
                    if (err) {
                        console.error("Unable to query for items to delete. Error:", JSON.stringify(err, null, 2));
                    } else {
                        //note sorting by date is performed automatically due to table having timestamp
                        //as the sort key
                        
                        //time formatting http://stackoverflow.com/questions/10645994/node-js-how-to-format-a-date-string-in-utc
                        //return a csv file
                        if (querydata.Items[0].type == 'csv') {
                            //format as csv
                            var csvoutput = "DateTime(UTC), Value\n";
                            for (var i = 0; i < queryIOTdata.Items.length; i++) {
                                var strdate = new Date(queryIOTdata.Items[i].datetime).toISOString().replace(/T/, ' ').replace(/\..+/, '')
                                csvoutput += strdate + "," + queryIOTdata.Items[i].data + "\r\n";
                            }
                            
                            //and send as downloadable file
                            //res.setHeader('Content-disposition', 'attachment; filename=data.csv');
                            res.set('Content-Type', 'text/csv');
                            res.status(200).send(csvoutput);
                            return "0";

                        }
                        //return a html file (basic table)
                        else if (querydata.Items[0].type == 'html') {
                            var htmloutput = "<tr><th>DateTime(UTC)</th><th>Value</th></tr>";
                            for (var i = 0; i < queryIOTdata.Items.length; i++) {
                                var strdate = new Date(queryIOTdata.Items[i].datetime).toISOString().replace(/T/, ' ').replace(/\..+/, '')
                                htmloutput += "<tr><td>" + strdate + "</td><td>" + queryIOTdata.Items[i].data + "</td></tr>\r\n";
                            }
                            
                            res.render('htmlOutput', { rows: htmloutput });
                            return "0";
                        }
                        
                        //return a svg (or png) plot using d3
                        else if (querydata.Items[0].type == 'svg' || querydata.Items[0].type == 'png') {
                            html = '<!doctype html><html></html>'
                            var document = jsdom.jsdom(html)
                            
                            //data array
                            var dataFormatted = [];
                            
                            for (var i = 0; i < queryIOTdata.Items.length; i++) {
                                //data.push(parseInt(queryIOTdata.Items[i].data));
                                //var strdate = new Date(queryIOTdata.Items[i].datetime).toISOString().replace(/T/, ' ').replace(/\..+/, '');
                                
                                var dd = {};
                                dd.datetime = new Date(queryIOTdata.Items[i].datetime);
                                dd.value = parseInt(queryIOTdata.Items[i].data);
                                dataFormatted.push(dd);
                            }
                            
                            //scaling
                            var margin = { top: 20, right: 20, bottom: 110, left: 40 },
                                width = 700 - margin.left - margin.right,
                                height = 400 - margin.top - margin.bottom;
                            
                            var date_format = d3.time.format.utc('%d-%m-%Y %H:%M:%S');
                            
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
                                .domain([0, d3.max(dataFormatted.map(function (dd) { return dd.value; }))]).nice();
                            
                            var xAxis = d3.svg.axis().scale(x).tickFormat(date_format);
                            var yAxis = d3.svg.axis().scale(y).orient("left").ticks(10, "");
                            
                            //line plot points
                            var line = d3.svg.line()
                                //.interpolate("basis")
                                .x(function (dd) { return x(dd.datetime); })
                                .y(function (dd) { return y(dd.value); });
                            
                            //add axes to canvas
                            canvas.append("g")
                              .attr("class", "axis")
                              .attr("transform", "translate(0," + height + ")")
                              .call(xAxis)
                              .selectAll("text")
                              .style("text-anchor", "end")
                              .attr("dx", "-0.8em")
                              .attr("dy", "-0.55em")
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
                            
                            //and send the file to the client
                            var html = svg
                                .attr("title", "svg Plot")
                                .attr("version", 1.1)
                                .attr("xmlns", "http://www.w3.org/2000/svg")
                                .node().outerHTML;
                            //res.setHeader('Content-disposition', 'attachment; filename=data.svg');
                            //var svgGraph = d3.select('svg').attr('xmlns', 'http://www.w3.org/2000/svg');
                            //var svgXML = (jsdom.jsdom.(doc));
                            //var serializer = new XMLSerializer();
                            //var source = serializer.serializeToString(svg);
                            
                            //if svg, then send it
                            if (querydata.Items[0].type == 'svg') {
                                res.set('Content-Type', 'image/svg+xml');
                                res.status(200).send(html);
                                return "0";
                                //res.render('svgOutput', { svgstuff: svg.node().outerHTML });
                            }
                            //or png, need to render to canvas then convert to png
                            else if (querydata.Items[0].type == 'png') {
                                var canvas = new fabric.createCanvasForNode(700, 400);
                                 
                                fabric.loadSVGFromString(html, function (objects, options) {
                                    var obj = new fabric.PathGroup(objects, options);
                                    canvas.add(obj);
                                    canvas.renderAll();
                                    var stream = canvas.createPNGStream();
                                
                                    //res.setHeader('Content-disposition', 'attachment; filename=data.png');
                                    res.set('Content-Type', 'image/png');
                                    stream.pipe(res);
                                    return "0";
                                });

                                
                            }
                                                     
                        }
                    }
                });
            }
        }
    });

    
   
}