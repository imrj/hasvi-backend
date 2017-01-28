//Helper function to take into account timezones
//We're working in millisec
exports.dateCompensateTimezone = function (queryViewDataItems) {
    if (typeof queryViewDataItems.timezone === "undefined" || queryViewDataItems.timezone === null || parseInt(queryViewDataItems.timezone) == 0) {
        return 0;
    }
    else {
        return parseInt(queryViewDataItems.timezone) * 3600 * 1000;
    }
}

exports.dateCompensateTimezoneString = function (queryViewDataItems) {
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