var versionDebug = require('../util/VersionDebug');
var XLSX = require('xlsx');


//Given the data (array of data), create and return a Excel string
exports.xlsxView = function (inputDataNameL, inputDataNameR, inputDataL, inputDataR, timezone, timezoneString) {
    var wopts = { bookType: 'xlsx', bookSST: false, type: 'buffer' };
    var workbook = { SheetNames: [], Sheets: {} };
    var worksheet = {};

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

    //put in title row headers
    worksheet[XLSX.utils.encode_cell({ c: 0, r: 0 })] = { v: "DateTime(" + timezoneString + ")", t: 's' };
    for (index = 0; index < inputDataNameL.length; ++index) {
        worksheet[XLSX.utils.encode_cell({ c: index + 1, r: 0 })] = { v: inputDataNameL[index], t: 's' };
    }
    for (index = 0; index < inputDataNameR.length; ++index) {
        worksheet[XLSX.utils.encode_cell({ c: index + 1 + inputDataNameL.length, r: 0 })] = { v: inputDataNameR[index], t: 's' };
    }

    //interate from min to max time (in 1min steps, so 60000ms steps)
    var atRow = 1;
    for (timeStep = mintime; timeStep < maxtime + 1 + 60000; timeStep = timeStep + 60000) {
        var strdate = new Date(timeStep + timezone).toISOString().replace(/T/, ' ').replace(/\..+/, '');
        
        var isDatainRow = 0;
        var RowInput = [];

        //and if there is a match from any stream, add a new line
        for (index = 0; index < inputDataL.length; ++index) {
            if (inputDataL[index].length > 0 && inputDataL[index][0].datetime < (timeStep + 60000)) {
                RowInput[index] = inputDataL[index].shift().data;
                isDatainRow = 1;
            }
        }
        for (index = 0; index < inputDataR.length; ++index) {
            if (inputDataR[index].length > 0 && inputDataR[index][0].datetime < (timeStep + 60000)) {
                RowInput[inputDataL.length + index] = inputDataR[index].shift().data;
                isDatainRow = 1;
            }
        }
        if (isDatainRow) {
            worksheet[XLSX.utils.encode_cell({ c: 0, r: atRow })] = { v: strdate, t: 's' };
            for (index = 0; index < RowInput.length; ++index) {
                if (RowInput[index] != null)
                    worksheet[XLSX.utils.encode_cell({ c: index + 1, r: atRow })] = { v: RowInput[index], t: 'n' };
            }
            atRow++;
        }
    }

    //encode the worsksheet
    var range = { s: { c: 0, r: 0 }, e: { c: inputDataNameL.length + inputDataNameR.length, r: atRow } };
    worksheet['!ref'] = XLSX.utils.encode_range(range);

    //create the workbook
    workbook.SheetNames.push("Data");
    workbook.Sheets["Data"] = worksheet;

    return XLSX.write(workbook, wopts);
}
