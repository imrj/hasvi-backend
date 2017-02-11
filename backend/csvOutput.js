
var versionDebug = require('../util/VersionDebug');


//Given the data (array of data), create and return a csv string
exports.csvView = function (inputDataNameL, inputDataNameR, inputDataL, inputDataR, timezone, timezoneString) {
    var csvoutput = "";

    //add the header line
    csvoutput += "DateTime(" + timezoneString + ")";
    for (index = 0; index < inputDataNameL.length; ++index) {
        csvoutput += "," + inputDataNameL[index];
    }
    for (index = 0; index < inputDataNameR.length; ++index) {
        csvoutput += "," + inputDataNameR[index];
    }

    csvoutput += "\r\n";

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
        var curline = strdate;
        var dataInline = 0;

        //and if there is a match from any stream, add a new line
        for (index = 0; index < inputDataL.length; ++index) {
            if (inputDataL[index].length > 0 && inputDataL[index][0].datetime < (timeStep + 60000)) {
                var newinput = inputDataL[index].shift();
                curline += "," + newinput.data;
                dataInline = 1;
            }
            else {
                curline += ",";
            }
        }
        for (index = 0; index < inputDataR.length; ++index) {
            if (inputDataR[index].length > 0 && inputDataR[index][0].datetime < (timeStep + 60000)) {
                var newinput = inputDataR[index].shift();
                curline += "," + newinput.data;
                dataInline = 1;
            }
            else {
                curline += ",";
            }
        }

        if (dataInline == 1) {
            csvoutput += curline;
            csvoutput += "\r\n";
        }
    }
    
    return csvoutput;
}