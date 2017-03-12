
var versionDebug = require('../util/VersionDebug');


//Given the data (array of data), create and return a csv string
exports.chartjsView = function (inputDataNameL, inputDataNameR, inputDataL, inputDataR, timezone, timezoneString) {
    var retjsObj = {};

    //figure out which y-axis to show
    if (inputDataL.length > 0)
        retjsObj.showL = 'true';
    else
        retjsObj.showL = 'false';

    if (inputDataR.length > 0)
        retjsObj.showR = 'true';
    else
        retjsObj.showR = 'false';

    //generate the datasets
    retjsObj.dataset = "";

    //left items
    for (index = 0; index < inputDataL.length; ++index) {
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
        //if (inputDataR[index].length > 0 && inputDataR[index][inputDataR[index].length - 1].datetime > maxtime) {
        //    maxtime = inputDataR[index][inputDataR[index].length - 1].datetime;
        //}
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

    //figure out if need need to hide/show the y-axis for each side
    retjsObj.showL

    return retjsObj;
}