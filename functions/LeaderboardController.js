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
const nodemailer = require('nodemailer');

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
                if(key != divisionType) {
                    let leaderboarObj = {};
                    if(!userProfile[key]){
                        return;
                    }
                    leaderboarObj.TotalScore = leaderboard[key].TotalScore ? leaderboard[key].TotalScore : 0;
                    leaderboarObj.UserName = userProfile[key].Email;
                    if (userProfile[key] && userProfile[key].UserName) {
                        leaderboarObj.UserName = userProfile[key].UserName;
                    }
                    data.push(leaderboarObj);
                }
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
        let playerScore = dal.getPlayerScore('PlayerScore');
        //let playerScore = dal.getFirebaseData('PlayerScore');


        Promise.all([backupLeaderBoardData, bronzeRank, silverRank, goldRank, playerData, playerScore]).then(function (snapshots) {
            bronzeRank = snapshots[1];
            silverRank = snapshots[2];
            goldRank = snapshots[3];
            playerData = snapshots[4];
            let playerDataVal = snapshots[4].val();
            playerScore = snapshots[5];
            let playerScoreVal = snapshots[5].val();

            let resetItem = ["PU5", "PU6", "PU7", "PU8", "PU9", "PU10", "PU11", "PU12", "PU13", "PU14"]

            // bronze data
            let newBronzeRank = {};
            let bronzeArray = bronzeRank.demotionData
                .concat(bronzeRank.keepPositionData)
                .concat(silverRank.demotionData);
            if (bronzeArray.length > 0) {
                bronzeArray.map((item) => {
                    let key = item.key;
                    delete item.key;
                    //item.TotalScore = 0;
                    newBronzeRank[key] = item;
                    if (playerDataVal[key]) {
                        playerDataVal[key].ProgressStats.CurrentLeaderboard = "bronze";
                        let newPowerUps = [];
                        let powerUps = playerDataVal[key].PowerUps;
                        if(powerUps){
                            powerUps.forEach(function (powerUp) {
                                if(resetItem.indexOf(powerUp.id) == -1){
                                    newPowerUps.push(powerUp);
                                }
                            });
                        }
                        // console.log(newPowerUps)
                        playerDataVal[key].PowerUps = newPowerUps;
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
                    //item.TotalScore = 0;
                    newSilverRank[key] = item;
                    if (playerDataVal[key]) {
                        playerDataVal[key].ProgressStats.CurrentLeaderboard = "silver";
                        let newPowerUps = [];
                        let powerUps = playerDataVal[key].PowerUps;
                        if(powerUps){
                            powerUps.forEach(function (powerUp) {
                                if(resetItem.indexOf(powerUp.id) == -1){
                                    newPowerUps.push(powerUp);
                                }
                            });
                        }
                        playerDataVal[key].PowerUps = newPowerUps;
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
                    //item.TotalScore = 0;
                    newGoldRank[key] = item;
                    if (playerDataVal[key]) {
                        playerDataVal[key].ProgressStats.CurrentLeaderboard = "gold";
                        let newPowerUps = [];
                        let powerUps = playerDataVal[key].PowerUps;
                        if(powerUps){
                            powerUps.forEach(function (powerUp) {
                                if(resetItem.indexOf(powerUp.id) == -1){
                                    newPowerUps.push(powerUp);
                                }
                            });
                        }
                        playerDataVal[key].PowerUps = newPowerUps;
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

            //set player data
            Object.keys(playerScoreVal).map((playerKey)=>{
                Object.keys(playerScoreVal[playerKey]).map((level)=>{
                    playerScoreVal[playerKey][level].BestScore = 0
                });
            });

            playerData.ref.set(playerDataVal);
            playerScore.ref.set(playerScoreVal);

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
                }
                // dataCalculateBefore: {
                //     bronze: bronzeRank,
                //     silver: silverRank,
                //     gold: goldRank,
                // }
            };
            console.log(JSON.stringify(infData));
            console.log("end update leaderBoard");
        });
    }
    catch (err) {
        console.log(err);
    }
};
exports.sendEmail = function (callback) {
    try {
        let emailSetting = dal.getFirebaseData('EmailSetting');
        let leaderboard = dal.getFirebaseData('Leaderboard');
        let userProfile = dal.getFirebaseData('UserProfile');
        let option = "";
        Promise.all([emailSetting, leaderboard, userProfile]).then(function (snapshots) {
            let emailSetting = snapshots[0];
            //let leaderboardkey = Object.keys(snapshots[1])[0];
            //let leaderboardHistory = snapshots[1][leaderboardkey];
            let leaderboard = snapshots[1];
            let userProfile = snapshots[2];

            //process leaderboard
            let topN = emailSetting.topN ? parseInt(emailSetting.topN) : 0;
            let data = {
                bronze: [],
                silver: [],
                gold: [],
            };
            Object.keys(leaderboard).map((divisionType, idx) => {
                let dataDivision = [];
                Object.keys(leaderboard[divisionType]).map((key, idx) => {
                    if(!userProfile[key]){
                        return;
                    }
                    let leaderboarObj = {};
                    leaderboarObj.TotalScore = leaderboard[divisionType][key].TotalScore ? leaderboard[divisionType][key].TotalScore : 0;
                    leaderboarObj.UserName = userProfile[key].Email;
                    leaderboarObj.Email = "";
                    leaderboarObj.DOB = "";
                    leaderboarObj.Telephone = "";
                    if (userProfile[key] && userProfile[key].UserName) {
                        leaderboarObj.UserName = userProfile[key].UserName;
                    }
                    if (userProfile[key] && userProfile[key].Email) {
                        leaderboarObj.Email = userProfile[key].Email;
                    }
                    if (userProfile[key] && userProfile[key].DOB) {
                        leaderboarObj.DOB = userProfile[key].DOB;
                    }
                    if (userProfile[key] && userProfile[key].Telephone) {
                        leaderboarObj.Telephone = userProfile[key].Telephone;
                    }
                    dataDivision.push(leaderboarObj);

                });
                dataDivision.sort((a, b) => {
                    if (a.TotalScore < b.TotalScore)
                        return 1;
                    if (a.TotalScore > b.TotalScore)
                        return -1;
                    return 0;
                });
                data[divisionType] = dataDivision.slice(0, topN);
            });
            let transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: emailSetting.emailAddress,
                    pass: emailSetting.password,
                }
            });

            // let transporter = nodemailer.createTransport(
            //     smtp({
            //         host: 'empower.oneempower.com',
            //         port: 587,
            //         auth: {
            //             user: 'hannd',
            //             pass: 'Oeoe123',
            //         },
            //     })
            // );
            // const transporter = nodemailer.createTransport(
            //     `smtps://hannd:Oeoe123@empower.oneempower.com`);

            let mailOptions = {
                from: `${emailSetting.emailId}<${emailSetting.emailAddress}>`,
                //from: `${emailSetting.emailId}<${emailSetting.emailAddress}>`,
                //from: `${emailSetting.emailId}<${emailSetting.emailAddress}>`,
                //from: 'han.nguyendinh45@gmail.com',
                to: emailSetting.emailTo,
                subject: 'Tournament Report',
                html: ''
            };

            let displaydata = '';
            Object.keys(data).map((division) => {

            });

            Object.keys(data).map((division) => {
                let divisionStr = '';
                data[division].map((item, idx) => {
                    divisionStr += `
                <tr>
                    <td>${idx + 1}</td>
                    <td style="text-align: left">${item.UserName}</td>
                    <td style="text-align: left">${item.Email}</td>
                    <td style="text-align: left">${item.Telephone}</td>
                    <td style="text-align: left">${item.DOB}</td>
                    <td>${item.TotalScore}</td>
                </tr>`
                });

                displaydata += `
                    <h3>${division == 'bronze' ? 'Division 3' : division == 'silver' ? 'Division 2' : 'Division 1'}</h3>
                    <table class="table" width="100%" border="1" cellpadding="0" cellspacing="0" bgcolor="#FFFFFF">
                        <thead>
                            <tr style="border: 1px solid black">
                                <th align="">Poisition</th>
                                <th>User Name</th>
                                <th>Email Adress</th>
                                <th>Phone Number</th>
                                <th>Date Of Birth</th>
                                <th>Score</th>
                            </tr>
                        </thead>
                        <tbody>
                           ${divisionStr}
                        </tbody>
                    </table>
                `
            });

            mailOptions.html = `
<html>
    <head>
        <link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.7/css/bootstrap.min.css" integrity="sha384-BVYiiSIFeK1dGmJRAkycuHAHRg32OmUcww7on3RYdg4Va+PmSTsz/K68vbdEjh4u" crossorigin="anonymous">
        <style type="text/css">
            th, td{
                text-align: center;
            }
         
            thead tr{
                background-color: #ffbc00;
            }
            h2{
                text-align: center;
            }
        </style>
    </head>
    <body>
        <h2>Tournament Report</h2>
        ${displaydata}
    </body>
</html>
    `;
            option = mailOptions;
            transporter.sendMail(mailOptions, callback
            // {
            //     if (error) {
            //         console.log(error);
            //         callback(false);
            //         if (res) {
            //             res.status(200).send({'status': 'Email not sent'});
            //         }
            //     } else {
            //         console.log('Email sent: ' + info.response);
            //         if (res) {
            //             res.status(200).send({'status': 'Email sent'});
            //         }
            //         callback(true);
            //     }
            // }
            );
        });
    } catch (err) {
        console.error(err);
        if (res) {
            res.status(500).send(JSON.stringify({'status': 'Internal Server error'}));
        }
        callback(false);
    }
}




