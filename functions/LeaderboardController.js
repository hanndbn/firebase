/**
 * Created by Mukhtiar.Ahmed on 7/3/2017.
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin')
const database = admin.database();
const moment = require('moment');
const dal = require('./dal');
const utils = require('./utils');

exports.getTopPlayers = function(request, response) {
    if(!request.body || !request.body.divisionType) {
        response.status(400).send(JSON.stringify({'status' : 'Bad Request'}));
        return;
    }
    let divisionType = request.body.divisionType;
    try {
        database.ref('Leaderboard/'+ divisionType).orderByChild('TotalScore')
            .limitToLast(50).once('value').then(function(snapshot){
                let data = [];
                snapshot.forEach(function (childSnapshot) {
                let userData = {};
                userData.playerName = childSnapshot.child('PlayerName').val();
                userData.totalScore = childSnapshot.child('TotalScore').val();
                    if(userData.playerName != ""){
                        data.push(userData);
                    }
            });
                let outputData = [];
                for(let i = (data.length - 1); i >= 0; i--){
                    outputData.push(data[i]);
                }
                response.send(JSON.stringify(outputData));
        });
        // Promise.all([dal.getTopPlayers(divisionType)]).then(function(data) {
        //     console.log(data);
        //     response.send(JSON.stringify(data));
        //
        //     // var levels = data[0];
        //     // var challenges = [];
        //     // if(levels) {
        //     //
        //     //     var levelIds = Object.keys(levels);
        //     //     dal.loadPlayerScores(user, levelIds, function (playScores) {
        //     //         playScores.forEach(function (playScore) {
        //     //             if (playScore) {
        //     //                 levels[playScore.id].PlayerScore = playScore.BestScore;
        //     //             }
        //     //         });
        //     //         for (const key of levelIds) {
        //     //             var level = levels[key];
        //     //             level.id = key;
        //     //             challenges.push(level);
        //     //         }
        //     //         response.send(JSON.stringify(challenges));
        //     //     });
        //     // } else {
        //     //     response.status(404).send(JSON.stringify({'status' : 'Not Found'}));
        //     // }
        // });

    }
    catch(err) {
        console.error(err);
        response.status(500).send(JSON.stringify({'status' : 'Internal Server error'}));
    }
};



