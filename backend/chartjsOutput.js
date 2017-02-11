
var versionDebug = require('../util/VersionDebug');


//Given the data (array of data), create and return a csv string
exports.chartjsView = function (inputDataNameL, inputDataNameR, inputDataL, inputDataR, timezone, timezoneString) {
    var retjsObj = {};

    ////find the earliest time out of all the streams (first datetime entry)
    //var mintime = Number.MAX_SAFE_INTEGER;
    //for (index = 0; index < inputDataL.length; ++index) {
    //    if (inputDataL[index].length > 0 && inputDataL[index][0].datetime < mintime) {
    //        mintime = inputDataL[index][0].datetime;
    //    }
    //}
    //for (index = 0; index < inputDataR.length; ++index) {
    //    if (inputDataR[index].length > 0 && inputDataR[index][0].datetime < mintime) {
    //        mintime = inputDataR[index][0].datetime;
    //    }
    //}
    ////find the maximum time of all the streams (last datetime entry)
    //var maxtime = 0;
    //for (index = 0; index < inputDataL.length; ++index) {
    //    if (inputDataL[index].length > 0 && inputDataL[index][inputDataL[index].length - 1].datetime > maxtime) {
    //        maxtime = inputDataL[index][inputDataL[index].length - 1].datetime;
    //    }
    //}
    //for (index = 0; index < inputDataR.length; ++index) {
    //    if (inputDataR[index].length > 0 && inputDataR[index][inputDataL[index].length - 1].datetime > maxtime) {
    //        maxtime = inputDataR[index][inputDataL[index].length - 1].datetime;
    //    }
    //}

    ////create the min and max date objects for x-axis scaling
    ////less than 30 min, round to min
    //if (maxtime - mintime < 1000 * 60 * 30) {
    //    mintime = Math.floor(mintime / (1000 * 60 * 1)) * 1000 * 60 * 1;
    //    maxtime = Math.ceil(maxtime / (1000 * 60 * 1)) * 1000 * 60 * 1;
    //}
    ////less than 180min, so round to 10's of minutes
    //else if (maxtime - mintime < 1000 * 60 * 180) {
    //    mintime = Math.floor(mintime / (1000 * 60 * 10)) * 1000 * 60 * 10;
    //    maxtime = Math.ceil(maxtime / (1000 * 60 * 10)) * 1000 * 60 * 10;
    //}
    ////less than 72 hours, round to hours
    //else if (maxtime - mintime < 1000 * 60 * 60 * 72) {
    //    mintime = Math.floor(mintime / (1000 * 60 * 60)) * 1000 * 60 * 60;
    //    maxtime = Math.ceil(maxtime / (1000 * 60 * 60)) * 1000 * 60 * 60;
    //}
    ////less than 30 days, round to days
    //else if (maxtime - mintime < 1000 * 60 * 60 * 24 * 30) {
    //    mintime = Math.floor(mintime / (1000 * 60 * 60 * 24)) * 1000 * 60 * 60 * 24;
    //    maxtime = Math.ceil(maxtime / (1000 * 60 * 60 * 24)) * 1000 * 60 * 60 * 24;
    //}
    ////less than 90 days, round to months (else)
    //else {
    //    //var tmpmindate = new Date(mindate).;
    //    //var tmpmaxdate = new Date(maxdate);
    //    //mindate = Math.floor(tmpmindate.) * 1000 * 60 * 60 * 24;
    //    //maxdate = Math.ceil(maxdate / (1000 * 60 * 60 * 24)) * 1000 * 60 * 60 * 24;
    //}
    //retjsObj.strmindate = new Date(mintime + timezone).toISOString().replace(/T/, ' ').replace(/\..+/, '');
    //retjsObj.strmaxdate = new Date(maxtime + timezone).toISOString().replace(/T/, ' ').replace(/\..+/, '');

    //generate the datasets
    retjsObj.dataset = "";

    //left items
    for (index = 0; index < inputDataL.length; ++index) {
        if (inputDataL[index].length > 0 && inputDataL[index][inputDataL[index].length - 1].datetime > maxtime) {
            maxtime = inputDataL[index][inputDataL[index].length - 1].datetime;
        }
        retjsObj.dataset += "\n{ label: \"" + inputDataNameL[index] + "\", yAxisID: 'L', ";
        retjsObj.dataset += "data: [";

        //put the actual data in
        for (datidx = 0; datidx < inputDataL[index].length; ++datidx) {
            var strdate = new Date(inputDataL[index][datidx].datetime + timezone).toISOString().replace(/T/, ' ').replace(/\..+/, '');
            retjsObj.dataset += "{x:\"" + strdate + "\",y:\"" + inputDataL[index][datidx].data + "\"}";

            if (datidx != inputDataL[index].length - 1) {
                retjsObj.dataset += ", ";
            }
        }
        var curColour = '#' + ("000000" + Math.random().toString(16).slice(2, 8).toUpperCase()).slice(-6);

        retjsObj.dataset += "],";
        retjsObj.dataset += "borderWidth: 2,";
        retjsObj.dataset += "cubicInterpolationMode: 'monotone',";
        retjsObj.dataset += "fill: false,";
        retjsObj.dataset += "lineTension: 0.0,";
        retjsObj.dataset += "pointRadius: 0,";
        retjsObj.dataset += "backgroundColor: '" + curColour + "',";
        retjsObj.dataset += "borderColor: '" + curColour + "'";
        retjsObj.dataset += "}";

        if (index != inputDataL.length - 1) {
            retjsObj.dataset += ", ";
        }
    }

    //need to put a comma if there's still more items
    if (inputDataR.length > 0 && inputDataL.length > 0) {
        retjsObj.dataset += ", ";
    }

    //right items
    for (index = 0; index < inputDataR.length; ++index) {
        if (inputDataR[index].length > 0 && inputDataR[index][inputDataR[index].length - 1].datetime > maxtime) {
            maxtime = inputDataR[index][inputDataR[index].length - 1].datetime;
        }
        retjsObj.dataset += "\n{ label: \"" + inputDataNameR[index] + "\", yAxisID: 'R', ";
        retjsObj.dataset += "data: [";

        //put the actual data in
        for (datidx = 0; datidx < inputDataR[index].length; ++datidx) {
            var strdate = new Date(inputDataR[index][datidx].datetime + timezone).toISOString().replace(/T/, ' ').replace(/\..+/, '');
            retjsObj.dataset += "{x:\"" + strdate + "\",y:\"" + inputDataR[index][datidx].data + "\"}";

            if (datidx != inputDataR[index].length - 1) {
                retjsObj.dataset += ", ";
            }
        }
        var curColour = '#' + ("000000" + Math.random().toString(16).slice(2, 8).toUpperCase()).slice(-6);

        retjsObj.dataset += "],";
        retjsObj.dataset += "borderWidth: 2,";
        retjsObj.dataset += "cubicInterpolationMode: 'monotone',";
        retjsObj.dataset += "fill: false,";
        retjsObj.dataset += "lineTension: 0.0,";
        retjsObj.dataset += "pointRadius: 0,";
        retjsObj.dataset += "backgroundColor: '" + curColour + "',";
        retjsObj.dataset += "borderColor: '" + curColour + "'";
        retjsObj.dataset += "}";

        if (index != inputDataR.length - 1) {
            retjsObj.dataset += ", ";
        }
    }

    return retjsObj;
}