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
            if (!leaderboard) {
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

exports.reportTopPlayer = function (leaderboard, userProfile, lastAccessToken) {
    let data = [];
    if (!leaderboard) {
        return [];
    }

    Object.keys(leaderboard).map((key, idx) => {
        let leaderboarObj = {};
        leaderboarObj.TotalScore = leaderboard[key].TotalScore ? leaderboard[key].TotalScore : 0;

        //set PlayerName
        leaderboarObj.PlayerName = "Player" + idx;
        if (userProfile[key] && userProfile[key].UserName) {
            leaderboarObj.PlayerName = userProfile[key].UserName;
        }

        leaderboarObj.Email = "";
        if (userProfile[key] && userProfile[key].Email) {
            leaderboarObj.Email = userProfile[key].Email;
        }

        leaderboarObj.Telephone = "";
        if (userProfile[key] && userProfile[key].Telephone) {
            leaderboarObj.Telephone = userProfile[key].Telephone;
        }

        leaderboarObj.Telephone = "";
        if (userProfile[key] && userProfile[key].Telephone) {
            leaderboarObj.Telephone = userProfile[key].Telephone;
        }

        leaderboarObj.MaybankAccessToken = lastAccessToken[key] ? lastAccessToken[key].Maybank_token : "";
        data.push(leaderboarObj);
    });

    data.sort((a, b) => {
        if (a.TotalScore < b.TotalScore)
            return 1;
        if (a.TotalScore > b.TotalScore)
            return -1;
        return 0;
    });

    // set ranking
    for (let i = 0; i < data.length; i++) {
        data[i].Ranking = i + 1;
        //delete data[i].TotalScore;
    }
    return data;
};

exports.reSchedule = function (req, res, leaderBoardUpdate) {
    if (!req.body) {
        //response.status(400).send(JSON.stringify({'status': 'Bad Request'}));
        console.log('Bad Request');
        return;
    }
    const rule = new schedule.RecurrenceRule();
    rule.second = 0;
    rule.minute = new schedule.Range(req.body.startMinute ? req.body.startMinute : 0, req.body.endMinute ? req.body.endMinute : 0);
    rule.hour = new schedule.Range(req.body.startHour ? req.body.startHour : 0, req.body.endHour ? req.body.endHour : 0);
    rule.dayOfWeek = new schedule.Range(0, 6);
    schedule.rescheduleJob(leaderBoardUpdate, {tz: "Asia/Singapore", rule: rule});
};

exports.updateLeaderBoard = function () {
    try {
        console.log("start update leaderBoard");
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
                    if (playerDataVal[key]) {
                        playerDataVal[key].ProgressStats.CurrentLeaderboard = "bronze";
                        playerDataVal[key].ProgressStats.TotalScore = 0;
                        playerDataVal[key].ProgressStats.TriviaScore = 0;
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
                    if (playerDataVal[key]) {
                        playerDataVal[key].ProgressStats.CurrentLeaderboard = "silver";
                        playerDataVal[key].ProgressStats.TotalScore = 0;
                        playerDataVal[key].ProgressStats.TriviaScore = 0;
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
                    if (playerDataVal[key]) {
                        playerDataVal[key].ProgressStats.CurrentLeaderboard = "gold";
                        playerDataVal[key].ProgressStats.TotalScore = 0;
                        playerDataVal[key].ProgressStats.TriviaScore = 0;
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
                dateBackup: dateStr,
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
            console.log("end update leaderBoard");
        });
    }
    catch (err) {
        console.error(err);
    }
};




