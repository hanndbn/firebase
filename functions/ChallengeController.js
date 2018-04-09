/**
 * Created by Mukhtiar.Ahmed on 7/3/2017.
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin')
const database = admin.database();
const moment = require('moment');
const dal = require('./dal');
const utils = require('./utils');

exports.getChallengesRemainingTime = function(request, response) {
    //console.log(database);
    let dateStr = moment().utcOffset(480).weekday(6).format('DD/MM/YYYY 23:59:59');
    let lastDate = moment(dateStr, 'DD/MM/YYYY HH:mm:dd');
    let duration = lastDate.diff(moment().utcOffset(480), 'seconds');
    return response.status(200).send(JSON.stringify({ChallengesRemainingTime : moment.utc(duration*1000).format('DD HH:mm:ss')}));
};

exports.updateChallenges = function(request, response) {
    let challengeData = dal.getFirebaseData('ChallengeData');
    let challenge = dal.getChallenge();
    try {
        Promise.all([challengeData, challenge]).then(function (data) {
            challengeData = data[0]
            challenge = data[1];
            let challengeTmp = {};
            Object.keys(challengeData).map((item)=>{
                challengeTmp[item] = {
                    ChallengeData:challengeData[item],
                    EndDate: 1639270000000,
                    StartDate: 1476200768000

                };
            });
            challenge.ref.set(challengeTmp);
            response.status(200).send(challengeTmp);
        });
    }catch(err) {
            console.error(err);
            response.status(500).send(JSON.stringify({'status' : 'Internal Server error'}));
    }
};


exports.getWeeklyChallenges = function(request, response) {
    var startOfWeek = moment().utc().startOf('week').toDate();
    var startOfWeekTime = moment().utc().startOf('week').subtract(1, "days").toDate().getTime();
    var endOfWeekTime   = moment().utc().endOf('week').subtract(1, "days").toDate().getTime();
    var currentTime = moment().utc().toDate().getTime();
    var user = request.user;
    let serverInfo = dal.getFirebaseData('ServerInfo');
    let currentWeeklyChallengesdal = dal.getCurrentWeeklyChallenges();
    try {
        Promise.all([currentWeeklyChallengesdal, serverInfo]).then(function(data) {
            var levels = data[0];
            var challenges = [];
            if(levels) {
                var levels = data[0];
                let weeklyChallengeIdx = parseInt(data[1].WeeklyChallengeIdx);
                console.log(weeklyChallengeIdx);
                let weeklyArray = [];
                for(let i = 1; i <= 5; i++){
                    weeklyArray.push('Level' + (i + ((weeklyChallengeIdx - 1) * 5)));
                }
                let levelIds = Object.keys(levels).filter((level, idx)=>{
                    return weeklyArray.includes(level)
                });
               // var levelIds = Object.keys(levels);
                dal.loadPlayerScores(user, levelIds, function (playScores) {
                    playScores.forEach(function (playScore) {
                        if (playScore) {
                            levels[playScore.id].PlayerScore = playScore.BestScore;
                        }
                    });
                    for (const key of levelIds) {
                        var level = levels[key];
                        level.id = key;
                        challenges.push(level);
                    }
                    response.status(200).send(JSON.stringify(challenges));
                });
            } else {
                response.status(404).send(JSON.stringify({'status' : 'Not Found'}));
            }
        });

    }
    catch(err) {
        console.error(err);
        response.status(500).send(JSON.stringify({'status' : 'Internal Server error'}));
    }
};



