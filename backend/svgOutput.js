﻿var d3 = require("d3");
var jsdom = require("jsdom");
var versionDebug = require('../util/VersionDebug');


//Given the data (array of data), create and return a csv string
exports.svgView = function (inputDataNameL, inputDataNameR, inputDataL, inputDataR, timezone, timezoneString) {
    html = '<!doctype html><html></html>';
    var document = jsdom.jsdom(html);

    //find the earliest time out of all the streams (first datetime entry)
    var mintime = Number.MAX_SAFE_INTEGER;
    for (index = 0; index < inputDataL.length; ++index) {
        if (inputDataL[index].length > 0 && inputDataL[index][0].datetime + timezone < mintime) {
            mintime = inputDataL[index][0].datetime + timezone;
        }
    }
    for (index = 0; index < inputDataR.length; ++index) {
        if (inputDataR[index].length > 0 && inputDataR[index][0].datetime + timezone < mintime) {
            mintime = inputDataR[index][0].datetime + timezone;
        }
    }
    //find the maximum time of all the streams (last datetime entry)
    var maxtime = 0;
    for (index = 0; index < inputDataL.length; ++index) {
        if (inputDataL[index].length > 0 && inputDataL[index][inputDataL[index].length - 1].datetime + timezone > maxtime) {
            maxtime = inputDataL[index][inputDataL[index].length - 1].datetime + timezone;
        }
    }
    for (index = 0; index < inputDataR.length; ++index) {
        if (inputDataR[index].length > 0 && inputDataR[index][inputDataR[index].length - 1].datetime + timezone > maxtime) {
            maxtime = inputDataR[index][inputDataR[index].length - 1].datetime + timezone;
        }
    }

    //find min and max data values
    var minvalueL = Number.MAX_SAFE_INTEGER;
    var maxvalueL = 0;
    var minvalueR = Number.MAX_SAFE_INTEGER;
    var maxvalueR = 0;
    for (index = 0; index < inputDataL.length; ++index) {
        if (inputDataL[index].length > 0) {
            for (datidx = 0; datidx < inputDataL[index].length; ++datidx) {
                if (inputDataL[index][datidx].data < minvalueL) {
                    minvalueL = inputDataL[index][datidx].data;
                }
                if (inputDataL[index][datidx].data > maxvalueL) {
                    maxvalueL = inputDataL[index][datidx].data;
                }
            }
        }
    }
    for (index = 0; index < inputDataR.length; ++index) {
        if (inputDataR[index].length > 0) {
            for (datidx = 0; datidx < inputDataR[index].length; ++datidx) {
                if (inputDataR[index][datidx].data < minvalueR) {
                    minvalueR = inputDataR[index][datidx].data;
                }
                if (inputDataR[index][datidx].data > maxvalueR) {
                    maxvalueR = inputDataR[index][datidx].data;
                }
            }
        }
    }

    //scaling
    var margin = { top: 20, right: 40, bottom: 110, left: 40 },
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

    //the y axis
    if (inputDataL.length > 0) {
        var yL = d3.scale.linear().range([height, 0])
            .domain([minvalueL, maxvalueL]).nice();
        var yAxisL = d3.svg.axis().scale(yL).orient("left").ticks(10, "");
    }
    if (inputDataR.length > 0) {
        var yR = d3.scale.linear().range([height, 0])
            .domain([minvalueR, maxvalueR]).nice();
        var yAxisR = d3.svg.axis().scale(yR).orient("right").ticks(10, "");
    }

    //The x axis
    var x = d3.time.scale.utc().range([0, width])
        .domain([mintime, maxtime]).nice();
    var xDateAxis = d3.svg.axis().scale(x).tickFormat(date_format);
    var xTimeAxis = d3.svg.axis().scale(x).tickFormat(time_format);
    
    //add axes to canvas. Note 2 axes - one for date, the other for time
    canvas.append("g")
        .attr("class", "x axis")
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
        .attr("class", "x axis")
        .attr("transform", "translate(0," + height + ")")
        .text("Date")
        .call(xTimeAxis)
        .selectAll("text")
        .style("text-anchor", "end")
        .attr("dx", "-0.8em")
        .attr("dy", "0em")
        .attr("transform", "rotate(-90)")
        .attr("fill", "#000")
        .attr("stroke", "none");

    canvas.append("text")      // text label for the x axis
        .attr("x", width / 2)
        .attr("y", height + margin.bottom - 10)
        .attr("fill", "#000")
        .attr("stroke", "none")
        .style("text-anchor", "middle")
        .style("font-size", "12px")
        .text("Time (" + timezoneString + ")");

    if (inputDataL.length > 0) {
        canvas.append("g")
            .attr("class", "y axis")
            .call(yAxisL)
            .selectAll("text")
            .attr("fill", "#000")
            .attr("stroke", "none");
    }

    if (inputDataR.length > 0) {
        canvas.append("g")
            .attr("class", "y axis")
            .attr("transform", "translate(" + width + " ,0)")
            .call(yAxisR)
            .selectAll("text")
            .attr("fill", "#000")
            .attr("stroke", "none");
    }

    //colours
    var color = d3.scale.category10();

    //left items
    for (index = 0; index < inputDataL.length; ++index) {

        //create the line
        var line = d3.svg.line()
            //.interpolate("basis")
            .x(function (dd) { return x(dd.datetime + timezone); })
            .y(function (dd) { return yL(dd.data); });

        //add the line to the plot
        canvas.append("path")
            .attr("class", "line")
            .attr("data-legend", inputDataNameL[index])
            .style("stroke", color(index))
            .style("stroke-width", "1")
            .style("fill", "none")
            .attr("d", line(inputDataL[index]))
    }

    //right items
    for (index = 0; index < inputDataR.length; ++index) {

        //create the line
        var line = d3.svg.line()
            //.interpolate("basis")
            .x(function (dd) { return x(dd.datetime + timezone); })
            .y(function (dd) { return yR(dd.data); });

        //add the line to the plot
        canvas.append("path")
            .attr("class", "line")
            .attr("data-legend", inputDataNameR[inputDataL.length + index])
            .style("stroke", color(index))
            .style("stroke-width", "1")
            .style("fill", "none")
            .attr("d", line(inputDataR[index]))
    }

    //add final svg tags
    var html = svg
        .attr("title", "svg Plot")
        .attr("version", 1.1)
        .attr("xmlns", "http://www.w3.org/2000/svg")
        .node().outerHTML;

    return html;
}
