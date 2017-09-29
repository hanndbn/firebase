/**
 * Created by Mukhtiar.Ahmed on 6/21/2017.
 */
const functions = require('firebase-functions');
const admin = require('firebase-admin')
admin.initializeApp(functions.config().firebase);
const database = admin.database();
const express = require('express');
const fileUpload = require('express-fileupload');
const moment = require('moment');
const app = express.Router();
const dal = require('./dal');
const utils = require('./utils');
const challengeController = require('./ChallengeController');
const gameController = require('./GameController');
const playerController = require('./PlayerController');
const leaderboardController = require('./LeaderboardController');
const version = '1.0';
const scheduler = require('node-schedule');

let startedJob = false;
var j = scheduler.scheduleJob('07 * * * *', function(){
    if(!startedJob){
        console.log('The answer to life, the universe, and everything!');
        startedJob = true;
    }
});

exports.setDefaultUserDate = functions.auth.user().onCreate(function(event) {

    const user = event.data;
    console.log( ' setDefaultUserDate');
    try  {
        dal.addDefaultUserData(user);
    } catch(err) {
        console.error(err);
    }
});

const authenticate = (req, res, next) => {
    var idToken = '';
    if (!req.headers.authorization || !req.headers.authorization.startsWith('Bearer ')) {
         // res.status(403).send(JSON.stringify({'status' : 'Unauthorized'}));
         // return;
        req.user = {uid : 'S4iBgV67kebptSKJzEZjvUdKs4e2', name : 'bob'}
        next();
    }  else {
        idToken = req.headers.authorization.split('Bearer ')[1];
        admin.auth().verifyIdToken(idToken).then(decodedIdToken => {
            req.user = decodedIdToken;
            next();
        }).catch(error => {
            console.log(error);
            res.status(403).send(JSON.stringify({'status' : 'Unauthorized'}));
        });
    }
};

app.use(function (req, res, next) {
    console.log(req.originalUrl);
    res.header("Content-Type",'application/json');
    next();
});


// default options
app.use(fileUpload());

app.use(authenticate);

app.get( '/' + version + '/currentWeek', (request, response) => {
    var currentWeek = utils.currentWeek();
    response.send(JSON.stringify({'CurrentWeek' : currentWeek}));
});

app.get( '/'+ version +'/GetChallenges', challengeController.getWeeklyChallenges);

app.get( '/'+ version +'/GetShopItems', gameController.getShopItems);

app.get( '/'+ version +'/Player', playerController.getPlayer);

app.get( '/'+ version +'/GetLeaderboardTotalPlayers', gameController.getLeaderboardTotalPlayers);

app.post( '/'+ version +'/PostScoreForChallenge', playerController.postScoreForChallenge);

app.get( '/'+ version +'/GetLeaderboardPosition', playerController.getLeaderboardPosition);

app.post( '/'+ version +'/PurchaseItem', playerController.purchaseItem);

app.get( '/'+ version +'/GetInAppPurchaseItems', playerController.getInAppPurchaseItems);

app.post( '/'+ version +'/StorePurchase', playerController.storePurchase);

app.get( '/'+ version +'/GetCoins', playerController.getCoins);

app.get( '/'+ version +'/GetPowerUps', playerController.getPowerUps);

app.get( '/'+ version +'/GetPowerUpsOfType', playerController.getPowerUpsOfType);

app.post( '/'+ version +'/UsePowerUp', playerController.usePowerUp);

app.post( '/'+ version +'/DataImport', gameController.dataImport);

app.post( '/'+ version +'/InAppPurchase', gameController.addInAppPurchase);

app.post( '/'+ version +'/RewardPlayer', playerController.rewardPlayer);

app.post( '/'+ version +'/SetUserProfile', playerController.setUserProfile);

app.get( '/'+ version +'/EraseMaybankToken', playerController.eraseMaybankToken);

app.get( '/'+ version +'/GetUserProfile', playerController.getUserProfile);

// OE API
app.post( '/'+ version +'/GetTopPlayers', leaderboardController.getTopPlayers);


// ole OE API
const request = require('request');
exports.PurchaseMaybankItem = functions.https.onRequest((req, res) => {
    // responeReturn:
    let errorResponse = {
        "versionNo": "1505353646721",
        "language": "SG",
        "rsHeader": {
            "timeZone": "GMT" + moment().utcOffset(480).format('Z'),
            "date": moment().utcOffset(480).format('YYYYMMDD'),
            "time": moment().utcOffset(480).format('HHmmss'),
            "versionNo": "9005003",
            "appVersion": "1.0.0",
            "accessToken": "",
            "responseCode": "NN",
            "errorCode": "",
            "errorMessage": ""
        },
        "redeemData": {
            "itemToken": "",
            "itemCode": "",
            "quantity": "",
            "refNo": "" ,
            "pointRedeemed": "",
            "tpbalance": ""
        }
    };

    let itemId = req.body.itemId;
    let accessToken = req.body.accessToken;
    let userId = req.body.userId;
    if(!itemId || !accessToken || !userId){
        errorResponse.rsHeader.errorCode = "REQUEST_PARAMETER_INVALID";
        errorResponse.rsHeader.errorMessage = "request parameter invalid!";
        return res.json(errorResponse);
    }

    let headers =  {'content-type': 'application/json' };
    let url = "https://122.11.168.196:8434/api/gameRedemption";

    admin.database().ref('ItemMapping').once('value', function (items) {
        if(items.exists()) {
            let existItem = false;
            let itemCode = "";
            let pointRequired = "";
            items.forEach(function (item) {
                if (itemId == item.child('GameItemCode').val()) {
                    existItem = true;
                    itemCode = item.child('MaybankItemCode').val()
                    pointRequired = item.child('PointRequired').val()
                }
            });
            if (!existItem || itemCode === "" || pointRequired === "") {
                errorResponse.rsHeader.errorCode = "NOT_FOUND_DATA_MAPPING";
                errorResponse.rsHeader.errorMessage = "can not get data mapping in firebase database with item Id";
                return res.json(errorResponse);

            }

            // request to server
            let requestPurchase = {
                "rqHeader": {
                    "timeZone": "GMT" + moment().utcOffset(480).format('Z'),
                    "date": moment().utcOffset(480).format('YYYYMMDD'),
                    "time": moment().utcOffset(480).format('HHmmss'),
                    "accessToken": accessToken
                },
                "channelId" : "GM",
                "itemCode": itemCode,
                "quantity": "1",
                "totalPoint": pointRequired
            };

            admin.database().ref('UserProfile').once('value', function (accessUser) {
                let existUser = false;
                accessUser.forEach(function (user) {
                    if (userId == user.key) {
                        existUser = true;
                    }
                });
                if(!existUser){
                    errorResponse.rsHeader.errorCode = "NOT EXIST USER";
                    errorResponse.rsHeader.errorMessage = "not exist user in database with request item Id";
                    return res.json(errorResponse);
                }
            });

            request.post({
                url: url,
                json: true,
                headers: headers,
                rejectUnauthorized: false,
                strictSSL: false,
                secureProtocol: 'TLSv1_method',
                body: requestPurchase
            }, function (error, response, body) {
                if (!error && response.statusCode == 200) {
                    let bodyValid = body.rsHeader ? body.rsHeader.responseCode == '00' : false;
                    let tpbalance = body.redeemData ? body.redeemData.tpbalance : '';
                    if(bodyValid && userId && tpbalance){
                        admin.database().ref('UserProfile').once('value', function (accessUser) {
                            accessUser.forEach(function (user) {
                                if (userId == user.key) {
                                    let objUpdate = {};
                                    objUpdate.Player_Balance = tpbalance;
                                    user.ref.update(objUpdate);
                                }
                            });
                        });
                    }
                    return res.json(body);
                } else {
                    errorResponse.rsHeader.errorCode = "REQUEST_TO_SERVER_ERROR";
                    errorResponse.rsHeader.errorMessage = error.code;
                    return res.json({errorResponse});
                }
            });
        } else {
            errorResponse.rsHeader.errorCode = "NOT_EXIST_TABLE_ITEMMAPING";
            errorResponse.rsHeader.errorMessage = "not exist table ItemMapping in firebase database";
            return res.json(errorResponse);
        }
    });
});


exports.saveAccessUser = functions.https.onRequest((req, res) => {
    let outputRsHeader = {
        date: moment().utcOffset(480).format('YYYYMMDD'),
        time: moment().utcOffset(480).format('HHmmss'),
        timeZone: "GMT" + moment().utcOffset(480).format('Z'),
        accessToken: "",
        responseCode: "",
        errorCode: "",
        errorMessage: ""
    };
    let rqHeader = req.body.rqHeader;
    if (rqHeader == null || rqHeader == "") {
        outputRsHeader.responseCode = "NN";
        outputRsHeader.errorCode = "REQUEST_FORMAT_INVALID";
        outputRsHeader.errorMessage = "request format invalid";
        return res.json({rsHeader: outputRsHeader});
    }
    // get game user ID
    let accessToken = rqHeader.accessToken;
    if (accessToken == null) {
        accessToken = "";
    }

    // if game user id not valid
    let requestGameUserId = req.body.gameUserID;
    if (requestGameUserId == null || requestGameUserId == "") {
        outputRsHeader.accessToken = accessToken;
        outputRsHeader.responseCode = "NN";
        outputRsHeader.errorCode = "USER_ID_NOT_VALID";
        outputRsHeader.errorMessage = "game user id not valid";
        return res.json({rsHeader: outputRsHeader});
    }

    // get data from database
    admin.database().ref('UserProfile').once('value', function (accessUser) {
        let isExist = false;
        accessUser.forEach(function (user) {
            if (requestGameUserId == user.key) {
                isExist = true;
                // get info data from request
                let requestAccessToken = accessToken;
                let requestCountry = req.body.country;
                let requestTierCode = req.body.tierCode;
                let requestTPBalance = req.body.TPBalance;

                let objUpdate = {};
                if (requestAccessToken != null && requestAccessToken != "") {
                    objUpdate.Maybank_token = requestAccessToken;
                }
                if (requestCountry != null && requestCountry != "") {
                    objUpdate.Player_Country = requestCountry;
                }
                if (requestTierCode != null && requestTierCode != "") {
                    objUpdate.Player_Tier = requestTierCode;
                }
                objUpdate.MaybankLoggedIn = true;

                if (requestTPBalance != null && requestTPBalance != "") {
                    objUpdate.Player_Balance = requestTPBalance;
                }else{
                    objUpdate.Player_Balance = "0";
                }
                user.ref.update(objUpdate);
                // response
                outputRsHeader.accessToken = requestAccessToken;
                outputRsHeader.responseCode = "00";
            }
        });
        if (!isExist) {
            outputRsHeader.accessToken = accessToken;
            outputRsHeader.responseCode = "NN";
            outputRsHeader.errorCode = "NOT_EXIST_USER_ID";
            outputRsHeader.errorMessage = "not exist user game id";
        }
        return res.json({rsHeader: outputRsHeader});
    });
});

exports.importToDatabase = functions.https.onRequest((req, res) => {
    let database = req.body;
    dal.gameDataImport(database, function(error, records) {
        return res.json({result: "success"});
    });
    // //let database = JSON.parse(req.body.data).data;
    // for(let table in database){
    //     let tableData = admin.database().ref(table);
    //     database[table].forEach(function (data) {
    //         tableData.push(data);
    //     })
    // }
    return res.json({result: "false"});
});

app.use(function(request, response, next){
    response.status(404).send(JSON.stringify({'status' : 'Not Found'}));
});

// Expose the API as a function
exports.api = functions.https.onRequest(app);

exports.OEApi = functions.https.onRequest(app);