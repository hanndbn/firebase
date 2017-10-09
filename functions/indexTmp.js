/**
 * Created by Mukhtiar.Ahmed on 6/21/2017.
 */
const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp(functions.config().firebase);
const database = admin.database();
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
const version = '1.0';

const schedule = require("node-schedule");
const rule = new schedule.RecurrenceRule();
//rule.minute = 40;
rule.second = 59;
rule.minute = 59;
rule.hour = 23;
rule.dayOfWeek = 6;
const leaderBoardUpdate = schedule.scheduleJob({tz: "Asia/Singapore",rule: rule}, function(){
    console.log("start update leaderBoard");
    leaderboardController.updateLeaderBoard();
    console.log("end update leaderBoard");
});
leaderBoardUpdate.cancel();

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


    //console.log(moment("20171003 010000", "YYYYMMDD HHmmss").utcOffset(480).fromNow());
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

app.get( '/'+ version +'/GetChallengesRemainingTime', challengeController.getChallengesRemainingTime);

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

app.post( '/'+ version +'/ReSchedule', (request, response) => {
    leaderboardController.reSchedule(request, response, leaderBoardUpdate);
});

// Expose the API as a function
exports.api = functions.https.onRequest(app);