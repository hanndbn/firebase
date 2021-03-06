/**
 * Created by Mukhtiar.Ahmed on 6/21/2017.
 */
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const serviceAccount = require("./serverconfig");
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    "databaseURL": "https://footballfan-e341f.firebaseio.com",
    "storageBucket": "footballfan-e341f.appspot.com",
    "apiKey": "AIzaSyBTO0VLHb4zA8gEvDUgRsCYhECWF8OdddM",
    "authDomain": "footballfan-e341f.firebaseapp.com"
});
const db = admin.firestore();

// // Disable deprecated features
// db.settings({
//     timestampsInSnapshots: true
// });

exports.firestore = functions.https.onRequest((req, res) => {
    let docRef = db.collection('users').doc('alovelace');

    let setAda = docRef.set({
        first: 'Ada',
        last: 'Lovelace',
        born: 1815
    });

    return res.json({result: setAda});
});

// const serviceAccount = require("./serverconfig_sanbox");
// admin.initializeApp({
//     credential: admin.credential.cert(serviceAccount),
//     "databaseURL": "https://footballfansandbox.firebaseio.com",
//     "storageBucket": "footballfansandbox.appspot.com",
//     "apiKey": "AIzaSyDXCJ8Wohu4TOsLIUc9YwL4MefpEB35LAM",
//     "authDomain": "footballfansandbox.firebaseapp.com"
// });
// const serviceAccount = require("./serverconfig_CMS.json");
// admin.initializeApp({
//     credential: admin.credential.cert(serviceAccount),
//     "databaseURL": "https://oevcms.firebaseio.com",
//     "storageBucket": "oevcms.appspot.com",
//     "apiKey": "AIzaSyB7Jbuu4v1DU4JzEYgvgXrAjslEdigP-E0",
//     "authDomain": "oevcms.firebaseapp.com"
// });
//const database = admin.database();
const express = require('express');
const fileUpload = require('express-fileupload');
const moment = require('moment');
const app = express();
const dal = require('./dal');
const utils = require('./utils');
const challengeController = require('./ChallengeController');
const gameController = require('./GameController');
const playerController = require('./PlayerController');
const leaderboardController = require('./LeaderboardController');
const sha256 = require('js-sha256');
const version = '1.0';
const nodemailer = require('nodemailer');
const where = require('node-where');
const requestIp = require('request-ip');
const requestCountry = require('request-country');
const cors = require('cors');

const schedule = require("node-schedule");
var smtp = require('nodemailer-smtp-transport');
//const mySchedule = require('./schedule');

// auto run reset score
var checkSchedule  = schedule.scheduleJob({tz: "Asia/Singapore", rule: "*/60 * * * *"}, function () {
    console.log(moment().utcOffset(480).format('DD/MM/YYYY HH:mm:ss') + ': check every 1 minute');
    let serverInfo = dal.getFirebaseData('ServerInfo');
    try {
        Promise.all([serverInfo]).then(function (data) {
            serverInfo = data[0];
            let promotionDemotionSchedule = serverInfo.PromotionDemotionSchedule;
            if(promotionDemotionSchedule == 'define'){
                let promotionDemotionTimeStr = serverInfo.PromotionDemotionTime;
                let promotionDemotionTime = moment(promotionDemotionTimeStr, 'DD/MM/YYYY HH:mm:ss');
                let myRule = new schedule.RecurrenceRule();
                myRule.second = promotionDemotionTime.second();
                myRule.minute = promotionDemotionTime.minute();
                myRule.hour = promotionDemotionTime.hour();
                myRule.date = promotionDemotionTime.date();
                myRule.month = promotionDemotionTime.month();
                myRule.year = promotionDemotionTime.year();
                schedule.rescheduleJob(promotionSchedule,{tz: "Asia/Singapore", rule: myRule});
                console.log("check success");
            }
        });
    }catch(err) {
        console.error(err);
    }
});
schedule.cancelJob(checkSchedule);

var promotionSchedule  = schedule.scheduleJob({tz: "Asia/Singapore", rule: "*/60 * * * *"}, function () {
    console.log(moment().utcOffset(480).format('DD/MM/YYYY HH:mm:ss'));
    console.log('start process send Email');
    //console.log('check every 10 second');
    leaderboardController.sendEmail(function (error,info) {
        if (error) {
            console.log(error);
        } else {
            console.log('Email sent1: ' + info.response);
        }
        console.log('finish process send Email');
        //update leaderboard
        //leaderboardController.updateLeaderBoard();
    })
});
schedule.cancelJob(promotionSchedule);
exports.RunScheduleLeaderBoard = functions.https.onRequest((req, res) => {
    let endate = moment("31/12/2018 23:59:59", 'DD/MM/YYYY HH:mm:ss');
    schedule.rescheduleJob(checkSchedule,{tz: "Asia/Singapore", rule: "/*10 * * * * *", end: endate.toDate()});
    return res.json({result: "success"});
    // let playerData = dal.getPlayerData('PlayerData');
    // Promise.all([playerData]).then(function (snapshots) {
    //     let playerDataVal =  snapshots[0].val();
    //     //set player data
    //     Object.keys(playerDataVal).map((playerKey)=>{
    //         playerDataVal[playerKey].ProgressStats.TotalScore = 0;
    //         playerDataVal[playerKey].ProgressStats.TriviaScore = 0;
    //     });
    //
    //     playerData.ref.set(playerDataVal);
    // }
});

exports.updatePassword = functions.https.onRequest((req, res) => {
    let password = req.body.password;
    let uid = req.body.uid;
    let securedKey = req.body.securedKey;
    if(securedKey == "21021994"){
        admin.auth().updateUser(uid, {
            password: password,
        })
            .then(function(userRecord) {
                console.log("Successfully updated user", userRecord.toJSON());
            })
            .catch(function(error) {
                console.log("Error updating user:", error);
            });
        return res.json({result: "success"});
    }else{
        return res.json({result: "false"});
    }
});




// const rule = new schedule.RecurrenceRule();
// rule.second = 0;
// rule.minute = 45;
// rule.hour = 11;
// rule.dayOfWeek = 5;
// //leaderBoardUpdate = null;
// //leaderBoardUpdate.cancel();
// // leaderBoardUpdate.reschedule(rule, {tz: "Asia/Singapore",rule: rule});
// exports.ReScheduleLeaderBoard = functions.https.onRequest((req, res) => {
//     // if(isPattern){
//     //let rule = req.body.rule;
//     //console.log('rule ' + rule);
//     let leaderBoardUpdate = null;
//     const rule = new schedule.RecurrenceRule();
//     rule.second = req.body.second ? req.body.second : 0;
//     rule.minute = req.body.minute ? req.body.minute : 0;
//     rule.hour = req.body.hour ? req.body.hour : 0;
//     rule.dayOfWeek = new schedule.Range(0, 6);
//     if (leaderBoardUpdate == null) {
//         console.log('init leaderboard update functions')
//         leaderBoardUpdate = schedule.scheduleJob({tz: "Asia/Singapore", rule: rule}, function () {
//             console.log('start process send Email');
//             leaderboardController.sendEmail(function (error,info) {
//                 if (error) {
//                     console.log(error);
//                 } else {
//                     console.log('Email sent1: ' + info.response);
//                 }
//                 console.log('finish process send Email');
//                 //update leaderboard
//                 leaderboardController.updateLeaderBoard();
//             })
//         });
//     } else {
//         console.log('reschedule leaderboard')
//         leaderboardController.reSchedule(req, res, leaderBoardUpdate);
//     }
//
//     return res.json({result: "success"});
// });

exports.LeaderBoardUpdate = functions.https.onRequest((req, res) => {
    leaderboardController.sendEmail(function (error,info) {
        if (error) {
            console.log(error);
        } else {
            console.log('Email sent1: ' + info.response);
        }
        console.log('finish process send Email');
        //update leaderboard
        leaderboardController.updateLeaderBoard();
    });
    return res.json({result: "success"});
});
exports.LeaderBoardUpdate1 = functions.https.onRequest((req, res) => {
    leaderboardController.updateLeaderBoard1();
    return res.json({result: "success"});
});

exports.report = functions.https.onRequest((req, res) => {
    try {
        let leaderboard = dal.getFirebaseData('Leaderboard');
        let userProfile = dal.getFirebaseData('UserProfile');
        let lastAccessToken = dal.getFirebaseData('LastAccessToken');
        Promise.all([leaderboard, userProfile, lastAccessToken]).then(function (snapshots) {
            leaderboard = snapshots[0];
            userProfile = snapshots[1];
            lastAccessToken = snapshots[2];
            let bronze = leaderboardController.reportTopPlayer(leaderboard.bronze, userProfile, lastAccessToken);
            let silver = leaderboardController.reportTopPlayer(leaderboard.silver, userProfile, lastAccessToken);
            let gold = leaderboardController.reportTopPlayer(leaderboard.gold, userProfile, lastAccessToken);
            return res.json({
                bronze: bronze.length > 0 ? bronze : "",
                silver: silver.length > 0 ? silver : "",
                gold: gold.length > 0 ? gold : "",
            });

        });
    }
    catch (err) {
        return res.json({});
    }

});
exports.LoginMY = functions.https.onRequest((req, res) => {
    return playerController.checkCardBin(req, res);
});
// exports.sendEmail = functions.https.onRequest((req, res) => {
//     sendEmail(req, res);
// });

//exports.LoginMY.post('/' + version + '/LoginMY', playerController.checkCardBin);

exports.registerUser = functions.https.onRequest((req, res) => {
    let result = ({
        resultCode: 'NN',
        result: "register user fail"
    });
    // validattion request
    if (!req.body.Email) {
        result.result = "invalid email";
        res.status(200).send(result);
        return;
    }
    if (!req.body.Password) {
        result.result = "invalid password";
        res.status(200).send(result);
        return;
    }

    // create user
    admin.auth().createUser({
        email: req.body.Email,
        password: req.body.Password,
    })
        .then(function (user) {
            //console.log(user);
            dal.addDefaultUserData(user, req);
            result.resultCode = "00";
            result.result = "success";
            res.status(200).send(result);
            return;
        })
        .catch(function (error) {
            //console.log(error)
            result.result = error.toString();
            res.status(200).send(result);
            return;
        });
});


exports.setDefaultUserDate = functions.auth.user().onCreate(function (event) {
    const user = event.data;
    console.log(' setDefaultUserDate');
    try {
        dal.addDefaultUserData(user, {body: {}});
    } catch (err) {
        console.error(err);
    }
});

const authenticate = (req, res, next) => {
    //console.log(database);
    // let dateStr = moment().utcOffset(480).weekday(6).format('DD/MM/YYYY 23:59:59');
    // let lastDate = moment(dateStr, 'DD/MM/YYYY HH:mm:dd');
    // let duration = lastDate.diff(moment().utcOffset(480), 'seconds');
    // console.log(moment.utc(duration * 1000).format('DD HH:mm:ss'));

    //console.log(moment("20171003 010000", "YYYYMMDD HHmmss").utcOffset(480).fromNow());

    let countryCode = req.requestCountryCode;
    console.log(req.clientIp + " " + req.requestCountryCode);
    res.setHeader('country', countryCode);
    if(countryCode == 'VN' || countryCode == 'MY' || countryCode == 'SG'){
        res.setHeader('accessdenied', false);
    }else{
        res.setHeader('accessdenied', true);
        where.is(req.clientIp, function(err, result) {
            if (result) {
                countryCode = result.get('countryCode');
                console.log("recheck:" + countryCode);
                res.setHeader('country', countryCode);
                if(countryCode == 'VN' || countryCode == 'MY' || countryCode == 'SG'){
                    res.setHeader('accessdenied', false);
                }
            }
        });
    }

    //console.log(countryCode);
    // if(country == 'VN' || country == 'MY' || country == 'SG'){
    //     accessDenied = false
    // }
    // res.setHeader('accessdenied', accessDenied);
    // console.log(req.clientIp + " " + country);

    var idToken = '';
    if (!req.headers.authorization || !req.headers.authorization.startsWith('Bearer ')) {
        // res.status(403).send(JSON.stringify({'status' : 'Unauthorized'}));
        // return;
        req.user = {uid: 'S4iBgV67kebptSKJzEZjvUdKs4e2', name: 'bob'};
        console.log(req.originalUrl + " " + req.user.uid + " " +  JSON.stringify(req.body));
        next();
    } else {
        idToken = req.headers.authorization.split('Bearer ')[1];
        admin.auth().verifyIdToken(idToken).then(decodedIdToken => {
            req.user = decodedIdToken;
            //console.log(req.user.uid);
            console.log(req.originalUrl + " " +  req.user.uid  + " " +  JSON.stringify(req.body));
            next();
        }).catch(error => {
            console.log(error);
            res.status(403).send(JSON.stringify({'status': 'Unauthorized'}));
        });
    }
    //console.log(req.originalUrl + " " +  req.user ? req.user.uid : "" + " " +  JSON.stringify(req.body));
};

app.use(function (req, res, next) {
    //console.log(req.originalUrl);
    //console.log(req.originalUrl + " " + req.user ? req.user.uid + " " +  req.body : req.body);
    // console.log(req.body);
    res.header("Content-Type", 'application/json');
    next();
});

app.use(requestIp.mw());

app.use(requestCountry.middleware({
    attributeName: 'requestCountryCode', // default is 'requestCountryCode'
    privateIpCountry: 'VN' // Result for private network IPs
}));

// default options
app.use(fileUpload());
app.use(cors({origin: '*'}));
app.use(authenticate);

app.get('/' + version + '/currentWeek', (request, response) => {
    var currentWeek = utils.currentWeek();
    response.send(JSON.stringify({'CurrentWeek': currentWeek}));
});

app.get('/' + version + '/GetChallenges', challengeController.getWeeklyChallenges);

app.get('/' + version + '/GetShopItems', gameController.getShopItems);

app.get('/' + version + '/Player', playerController.getPlayer);

app.get('/' + version + '/GetLeaderboardTotalPlayers', gameController.getLeaderboardTotalPlayers);

app.post('/' + version + '/PostScoreForChallenge', playerController.postScoreForChallenge);

app.get('/' + version + '/GetLeaderboardPosition', playerController.getLeaderboardPosition);

app.post('/' + version + '/PurchaseItem', playerController.purchaseItem);

app.post('/' + version + '/PurchaseSpecialOffer', playerController.purchaseSpecialOffer);

app.get('/' + version + '/GetSpecialOffer', playerController.getSpecialOffer);

app.get('/' + version + '/GetInAppPurchaseItems', playerController.getInAppPurchaseItems);

app.post('/' + version + '/StorePurchase', playerController.storePurchase);

app.get('/' + version + '/GetCoins', playerController.getCoins);

app.get('/' + version + '/GetPowerUps', playerController.getPowerUps);

app.get('/' + version + '/GetPowerUpsOfType', playerController.getPowerUpsOfType);

app.post('/' + version + '/UsePowerUp', playerController.usePowerUp);

app.post('/' + version + '/DataImport', gameController.dataImport);

app.post('/' + version + '/InAppPurchase', gameController.addInAppPurchase);

app.post('/' + version + '/RewardPlayer', playerController.rewardPlayer);

app.post('/' + version + '/SetUserProfile', playerController.setUserProfile);

app.get('/' + version + '/EraseMaybankToken', playerController.eraseMaybankToken);

app.get('/' + version + '/GetUserProfile', playerController.getUserProfile);

// OE API
app.post('/' + version + '/GetTopPlayers', leaderboardController.getTopPlayers);

app.get('/' + version + '/GetServerInfo', gameController.getServerInfo);

app.get('/' + version + '/GetChallengesRemainingTime', challengeController.getChallengesRemainingTime);

app.post('/' + version + '/GetVoucherReward', playerController.getVoucherReward);

app.post('/' + version + '/LoginMY', playerController.checkCardBin);

app.get('/' + version + '/GetTriviaQuestion', gameController.getTriviaQuestion);

app.get('/' + version + '/GetCountry', gameController.getCountry);

// app.post('/' + version + '/ReSchedule', (request, response) => {
//     leaderboardController.reSchedule(request, response, leaderBoardUpdate);
// });


// ole OE API
const request = require('request');
exports.PurchaseMaybankItemTest = functions.https.onRequest((req, res) => {
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
            "refNo": "",
            "pointRedeemed": "",
            "tpbalance": ""
        }
    };

    let itemId = req.body.itemId;
    let accessToken = req.body.accessToken;
    let userId = req.body.userId;
    if (!itemId || !accessToken || !userId) {
        errorResponse.rsHeader.errorCode = "REQUEST_PARAMETER_INVALID";
        errorResponse.rsHeader.errorMessage = "request parameter invalid!";
        return res.json(errorResponse);
    }

    let headers = {'content-type': 'application/json'};
    //let url = "https://122.11.168.196:8434/api/gameRedemption";
    let url = "https://uatrewards.maybank.com.sg/api/gameRedemption";
    //let url = "http://118.70.177.14:8080/api/gameRedemption";

    admin.database().ref('ItemMapping').once('value', function (items) {
        if (items.exists()) {
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
                }, "channelId": "GM", "itemCode": itemCode, "quantity": "1", "totalPoint": pointRequired
            };

            admin.database().ref('UserProfile').once('value', function (accessUser) {
                let existUser = false;
                accessUser.forEach(function (user) {
                    if (userId == user.key) {
                        existUser = true;
                    }
                });
                if (!existUser) {
                    errorResponse.rsHeader.errorCode = "NOT EXIST USER";
                    errorResponse.rsHeader.errorMessage = "not exist user in database with request item Id";
                    return res.json(errorResponse);
                }
            });

            request.post({
                url: url,
                json: true,
                headers: headers,
                //rejectUnauthorized: false,
                //strictSSL: false,
                //secureProtocol: 'TLSv1_method',
                body: requestPurchase
            }, function (error, response, body) {
                if (!error && response.statusCode == 200) {
                    let bodyValid = body.rsHeader ? body.rsHeader.responseCode == '00' : false;
                    let tpbalance = body.redeemData ? body.redeemData.tpbalance : '';
                    if (bodyValid && userId && tpbalance) {
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
            "refNo": "",
            "pointRedeemed": "",
            "tpbalance": ""
        }
    };

    let itemId = req.body.itemId;
    let accessToken = req.body.accessToken;
    let userId = req.body.userId;
    if (!itemId || !accessToken || !userId) {
        errorResponse.rsHeader.errorCode = "REQUEST_PARAMETER_INVALID";
        errorResponse.rsHeader.errorMessage = "request parameter invalid!";
        return res.json(errorResponse);
    }

    let headers = {'content-type': 'application/json'};
    //let url = "https://122.11.168.196:8434/api/gameRedemption";
    let url = "https://uatrewards.maybank.com.sg/api/gameRedemption";
    //let url = "http://localhost:8080/api/gameRedemption";
    //let url = "http://118.70.177.14:8080/api/gameRedemption";


    let itemMapping = dal.getFirebaseData('ItemMapping');
    let userData = dal.getFirebaseData('UserProfile/' + userId);

    Promise.all([itemMapping, userData]).then(function (snapshots) {
        itemMapping = snapshots[0];
        userData = snapshots[1];

        let existItem = false;
        let itemCode = "";
        let pointRequired = "";

        // check exist table item mapping
        if (itemMapping) {
            itemMapping.forEach(function (item) {
                if (itemId == item['GameItemCode']) {
                    existItem = true;
                    itemCode = item['MaybankItemCode'];
                    pointRequired = item['PointRequired'];
                }
            });
        } else {
            errorResponse.rsHeader.errorCode = "NOT_EXIST_TABLE_ITEMMAPING";
            errorResponse.rsHeader.errorMessage = "not exist table ItemMapping in firebase database";
            return res.json(errorResponse);
        }

        // check exist data in item mapping
        if (!existItem || itemCode === "" || pointRequired === "") {
            errorResponse.rsHeader.errorCode = "NOT_FOUND_DATA_MAPPING";
            errorResponse.rsHeader.errorMessage = "can not get data mapping in firebase database with item Id";
            return res.json(errorResponse);
        }
        // check exist user with user id
        if (!userData) {
            errorResponse.rsHeader.errorCode = "NOT EXIST USER";
            errorResponse.rsHeader.errorMessage = "not exist user in database with request item Id";
            return res.json(errorResponse);
        }
        //         request to server
        let requestPurchase = {
            "rqHeader": {
                "timeZone": "GMT" + moment().utcOffset(480).format('Z'),
                "date": moment().utcOffset(480).format('YYYYMMDD'),
                "time": moment().utcOffset(480).format('HHmmss'),
                "accessToken": accessToken
            }, "channelId": "GM", "itemCode": itemCode, "quantity": "1", "totalPoint": pointRequired
        };

        request.post({
            url: url,
            json: true,
            headers: headers,
            //rejectUnauthorized: false,
            //strictSSL: false,
            //secureProtocol: 'TLSv1_method',
            body: requestPurchase
        }, function (error, response, body) {
            if (!error && response.statusCode == 200) {
                console.log("request success");
                let bodyValid = body.rsHeader ? body.rsHeader.responseCode == '00' : false;
                let tpbalance = body.redeemData ? body.redeemData.tpbalance : '';
                if (bodyValid && userId && tpbalance) {
                    admin.database().ref('RedemptionHistory').once('value', function (redemptionSnapshot) {
                        let redemption = redemptionSnapshot.val() ? redemptionSnapshot.val() : {};
                        if (body.redeemData.itemToken != "" && redemption[body.redeemData.itemToken]) {
                            console.log("redeemed");
                            errorResponse.rsHeader.errorCode = "REDEMPTION FAILED. ITEM HAD REDEEMED";
                            errorResponse.rsHeader.errorMessage = "a item only redeem once";
                            return res.json(errorResponse);
                        } else if (body.redeemData.itemToken != "") {
                            console.log("itemtoken");
                            let SV = "12345";
                            let accessToken = body.rsHeader.accessToken;
                            let itemCode = body.redeemData.itemCode;
                            let quantity = body.redeemData.quantity;
                            let transactionDate = body.redeemData.transactionDate;
                            let transactioneTime = body.redeemData.transactionTime;
                            let refNo = body.redeemData.refNo;
                            let hashString = SV + accessToken + itemCode + quantity + transactionDate + transactioneTime + refNo;
                            let sha256String = sha256(hashString);
                            if (sha256String.toString().substr(0, 20).toUpperCase() == body.redeemData.itemToken) {
                                console.log("redeem success");
                                redemption[body.redeemData.itemToken] = body;
                                redemptionSnapshot.ref.set(redemption);

                                //update data UserProfile
                                admin.database().ref('UserProfile/' + userId).once('value', function (accessUser) {
                                    let objUpdate = {};
                                    objUpdate.Player_Balance = tpbalance;
                                    accessUser.ref.update(objUpdate);
                                    return res.json(body);
                                });
                            } else {
                                errorResponse.rsHeader.errorCode = "UNAUTHORIZED_PURCHASE";
                                errorResponse.rsHeader.errorMessage = "Unauthorized Purchase";
                                return res.json(errorResponse);
                            }
                        }
                    });
                }
            } else {
                errorResponse.rsHeader.errorCode = "REQUEST_TO_SERVER_ERROR";
                errorResponse.rsHeader.errorMessage = error.code;
                return res.json({errorResponse});
            }
        });
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
                let oldMaybank_token = user.val().Maybank_token;
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
                } else {
                    objUpdate.Player_Balance = "0";
                }
                dal.saveUserProfileData(user.key, oldMaybank_token);
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
    dal.gameDataImport(database, function (error, records) {
        return res.json({result: "success"});
    });
    // //let database = JSON.parse(req.body.data).data;
    // for(let table in database){
    //     let tableData = admin.database().ref(table);
    //     database[table].forEach(function (data) {
    //         tableData.push(data);
    //     })
    // }
    // return res.json({result: "false"});
});

app.use(function (request, response, next) {
    response.status(404).send(JSON.stringify({'status': 'Not Found'}));
});

// Expose the API as a function
exports.api = functions.https.onRequest(app);

exports.OEApi = functions.https.onRequest(app);

exports.updateChallenges  = functions.https.onRequest(challengeController.updateChallenges);