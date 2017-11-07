/**
 * Created by Mukhtiar.Ahmed on 7/3/2017.
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin')
const database = admin.database();
const moment = require('moment');
const dal = require('./dal');
const utils = require('./utils');
const schedule = require("node-schedule");

exports.getTopPlayers = function (request, response) {
    if (!request.body || !request.body.divisionType) {
        response.status(400).send(JSON.stringify({'status': 'Bad Request'}));
        return;
    }
    let divisionType = request.body.divisionType;
    try {
        let leaderboard = dal.getLeaderBoardData('Leaderboard/' + divisionType);
        let userProfile = dal.getFirebaseData('UserProfile');

        Promise.all([leaderboard, userProfile]).then(function (snapshots) {
            leaderboard = snapshots[0];
            userProfile = snapshots[1];
            // console.log(leaderboard);
            let data = [];
            if(!leaderboard){
                return response.status(200).send(JSON.stringify(data));
            }
            Object.keys(leaderboard).map((key, idx) => {
                let leaderboarObj = {};
                leaderboarObj.TotalScore = leaderboard[key].TotalScore ? leaderboard[key].TotalScore : 0;
                leaderboarObj.UserName = "Player" + idx;
                if (userProfile[key] && userProfile[key].UserName) {
                    leaderboarObj.UserName = userProfile[key].UserName;
                }
                data.push(leaderboarObj);
            });
            data.sort((a, b) => {
                if (a.TotalScore < b.TotalScore)
                    return 1;
                if (a.TotalScore > b.TotalScore)
                    return -1;
                return 0;
            });

            return response.status(200).send(JSON.stringify(data));
        });
    }
    catch (err) {
        console.error(err);
        response.status(500).send(JSON.stringify({'status': 'Internal Server error'}));
    }
};

exports.reSchedule = function (request, response, leaderBoardUpdate) {
    if (!request.body) {
        response.status(400).send(JSON.stringify({'status': 'Bad Request'}));
        return;
    }
    let isPattern = request.body.isPattern;
    if(isPattern){
        let rule = request.body.rule;
        schedule.rescheduleJob(leaderBoardUpdate, {tz: "Asia/Singapore",rule: rule});
    }else{
        let second = request.body.second;
        let minute = request.body.minute;
        let hour = request.body.hour;
        let dayOfWeek = request.body.dayOfWeek;
        //leaderBoardUpdate.
        const rule = new schedule.RecurrenceRule();
        // set second
        if (second) {
            rule.second = parseInt(second)
        }

        // set second
        if (minute) {
            rule.minute = parseInt(minute)
        }

        // set second
        if (hour) {
            rule.hour = parseInt(hour)
        }

        // set second
        if (dayOfWeek) {
            rule.dayOfWeek = parseInt(dayOfWeek)
        }
        schedule.rescheduleJob(leaderBoardUpdate, {tz: "Asia/Singapore",rule: rule});
    }
};

exports.updateLeaderBoard = function () {
    try {
        // backup leaderboard
        let dateStr = moment().utcOffset(480).format('YYYYMMDD-HHmmss');
        let backupLeaderBoardData = dal.backupLeaderBoardData(dateStr);

        let bronzeRank = dal.getLeaderBoardWithType("bronze");
        let silverRank = dal.getLeaderBoardWithType("silver");
        //console.log(silverRank)
        //return response.json(silverRank);
        let goldRank = dal.getLeaderBoardWithType("gold");

        let playerData = dal.getPlayerData('PlayerData');


        Promise.all([backupLeaderBoardData, bronzeRank, silverRank, goldRank, playerData]).then(function (snapshots) {
            bronzeRank = snapshots[1];
            silverRank = snapshots[2];
            goldRank = snapshots[3];
            playerData = snapshots[4];
            let playerDataVal = snapshots[4].val();

            // bronze data
            let newBronzeRank = {};
            let bronzeArray = bronzeRank.demotionData
                .concat(bronzeRank.keepPositionData)
                .concat(silverRank.demotionData);
            if (bronzeArray.length > 0) {
                bronzeArray.map((item) => {
                    let key = item.key;
                    delete item.key;
                    newBronzeRank[key] = item;
                    if(playerDataVal[key]){
                        playerDataVal[key].ProgressStats.CurrentLeaderboard = "bronze";
                    }

                });
            } else {
                newBronzeRank = {bronze: "bronze"}
            }

            //silver data
            let newSilverRank = {};
            let silverArray = silverRank.keepPositionData
                .concat(goldRank.demotionData)
                .concat(bronzeRank.promotionData);
            if (silverArray.length > 0) {
                silverArray.map((item) => {
                    let key = item.key;
                    delete item.key;
                    newSilverRank[key] = item;
                    if(playerDataVal[key]){
                        playerDataVal[key].ProgressStats.CurrentLeaderboard = "silver";
                    }
                });
            } else {
                newSilverRank = {silver: "silver"}
            }

            //gold data
            let newGoldRank = {};
            let goldArray = goldRank.keepPositionData
                .concat(goldRank.promotionData)
                .concat(silverRank.promotionData);
            if (goldArray.length > 0) {
                goldArray.map((item) => {
                    let key = item.key;
                    delete item.key;
                    newGoldRank[key] = item;
                    if(playerDataVal[key]){
                        playerDataVal[key].ProgressStats.CurrentLeaderboard = "gold";
                    }
                });
            } else {
                newGoldRank = {gold: "gold"}
            }

            let newLeaderBoard = {
                bronze: newBronzeRank,
                silver: newSilverRank,
                gold: newGoldRank,
            };

            database.ref('Leaderboard').once("value").then(function (snap) {
                snap.ref.set(newLeaderBoard);
            });

            playerData.ref.set(playerDataVal);

            let infData = {
                status: "success",
                dateBackup : dateStr,
                before: {
                    bronze: bronzeRank.numberPerson,
                    silver: silverRank.numberPerson,
                    gold: goldRank.numberPerson,
                },
                after: {
                    bronze: bronzeArray.length,
                    silver: silverArray.length,
                    gold: goldArray.length,
                },
                dataCalculateBefore: {
                    bronze: bronzeRank,
                    silver: silverRank,
                    gold: goldRank,
                }
            };

            console.log(JSON.stringify(infData));
        });
    }
    catch (err) {
        console.error(err);
    }
};




