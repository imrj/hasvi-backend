
var versionDebug = require('../util/VersionDebug');


//Given the data (array of data), create and return a csv string
exports.htmlView = function (inputDataNameL, inputDataNameR, inputDataL, inputDataR, timezone, timezoneString) {
    var htmloutput = "";

    //add the header line
    htmloutput += "<tr><th>DateTime(" + timezoneString + ")</th>";
    for (index = 0; index < inputDataNameL.length; ++index) {
        htmloutput += "<th>" + inputDataNameL[index] + "</th>";
    }
    for (index = 0; index < inputDataNameR.length; ++index) {
        htmloutput += "<th>" + inputDataNameR[index] + "</th>";
    }

    htmloutput += "</tr>\r\n";

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
    //if (!versionDebug.iot_onAWS()) { console.error("min=" + new Date(mintime).toISOString().replace(/T/, ' ').replace(/\..+/, '')); }
    //if (!versionDebug.iot_onAWS()) { console.error("max=" + new Date(maxtime).toISOString().replace(/T/, ' ').replace(/\..+/, '')); }

    //interate from min to max time (in 1min steps, so 60000ms steps)
    for (timeStep = mintime; timeStep < maxtime + 1 + 60000; timeStep = timeStep + 60000) {
        var strdate = new Date(timeStep + timezone).toISOString().replace(/T/, ' ').replace(/\..+/, '');
        var curline = "<tr><td>" + strdate + "</td>";
        var dataInline = 0;

        //and if there is a match from any stream, add a new line
        for (index = 0; index < inputDataL.length; ++index) {
            if (inputDataL[index].length > 0 && inputDataL[index][0].datetime < (timeStep + 60000)) {
                var newinput = inputDataL[index].shift();
                curline += "<td>" + newinput.data + "</td>";
                dataInline = 1;
            }
            else {
                curline += "<td></td>";
            }
        }
        for (index = 0; index < inputDataR.length; ++index) {
            if (inputDataR[index].length > 0 && inputDataR[index][0].datetime < (timeStep + 60000)) {
                var newinput = inputDataR[index].shift();
                curline += "<td>" + newinput.data + "</td>";
                dataInline = 1;
            }
            else {
                curline += "<td></td>";
            }
        }

        if (dataInline == 1) {
            htmloutput += curline;
            htmloutput += "</tr>";
        }
    }

    return htmloutput;
}