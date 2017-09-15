/**
 * Created by Mukhtiar.Ahmed on 7/19/2017.
 */

const moment = require('moment');
const path = require('path');
const os = require('os');
const fs = require('fs');


exports.simpleStringify = function(object){
    var simpleObject = {};
    for (var prop in object ){
        if (!object.hasOwnProperty(prop)){
            continue;
        }
        if (typeof(object[prop]) == 'object'){
            continue;
        }
        if (typeof(object[prop]) == 'function'){
            continue;
        }
        simpleObject[prop] = object[prop];
    }
    return JSON.stringify(simpleObject); // returns cleaned up JSON
};

exports.unique = function (arr) {
    var hash = {}, result = [];
    for ( var i = 0, l = arr.length; i < l; ++i ) {
        if ( !hash.hasOwnProperty(arr[i]) ) {
            hash[ arr[i] ] = true;
            result.push(arr[i]);
        }
    }
    return result;
}

exports.currentWeek = function() {
    var startOfWeekTime = moment().utc().startOf('week').subtract(1, "days").toDate().getTime();
    var endOfWeekTime   = moment().utc().endOf('week').subtract(1, "days").toDate().getTime();
    return {startOfWeek : startOfWeekTime, endOfWeek : endOfWeekTime};
}


/**
 * It is use to read excel sheet
 * @param exceltojson parser object
 * @param filePath full path of excel file with name.
 * @param sheetName excel file sheet name
 * @param callback
 * @returns {*}
 */
exports.readExcelSheet = function(exceltojson, filePath, sheetName,  callback) {


    try {
        exceltojson({
            input: filePath, //the same path where we uploaded our file
            output: null, //since we don't need output.json
            sheet:  sheetName,
            lowerCaseHeaders:false
        }, function(err,result){
            if(err) {
                console.error(err);
                return callback(err, null);
            } else {

                return callback(null, result);

            }
        });
    } catch (e){
        console.error(err);
        return callback("Corupted excel file", null);
    }
};


exports.isEmpty = function(obj) {
    return Object.keys(obj).length === 0;
};



