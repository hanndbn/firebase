/**
 * Created by Mukhtiar.Ahmed on 7/3/2017.
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin')
const database = admin.database();
const moment = require('moment');
const dal = require('./dal');
const utils = require('./utils');


exports.getWeeklyChallenges = function(request, response) {
    var startOfWeek = moment().utc().startOf('week').toDate();
    var startOfWeekTime = moment().utc().startOf('week').subtract(1, "days").toDate().getTime();
    var endOfWeekTime   = moment().utc().endOf('week').subtract(1, "days").toDate().getTime();
    var user = request.user;
    try {
        Promise.all([dal.getCurrentWeeklyChallenges(startOfWeekTime)]).then(function(data) {
            var levels = data[0];
            var challenges = [];
            if(levels) {

                var levelIds = Object.keys(levels);
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
                    response.send(JSON.stringify(challenges));
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



