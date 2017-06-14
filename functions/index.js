// The Cloud Functions for Firebase SDK to create Cloud Functions and setup triggers.
const functions = require('firebase-functions');

// The Firebase Admin SDK to access the Firebase Realtime Database. 
const admin = require('firebase-admin');
admin.initializeApp(functions.config().firebase);

// Take the text parameter passed to this HTTP endpoint and insert it into the
// Realtime Database under the path /messages/:pushId/original
exports.leaderboards = functions.https.onRequest((req, res) => {
    let object = admin.database().ref('leaderboards');
    object.once('value', function (snapshot) {
        let leaderBoards = [];
        snapshot.forEach(function (childSnapshot) {
            let highScore = childSnapshot.child('highScore').val();
            let userId = childSnapshot.child('userId').val();
            leaderBoards.push({userId: userId, highScore: highScore});
        });
        leaderBoards.sort(function (a, b) {
            return parseInt(b.highScore) - parseInt(a.highScore)
        });
        let rankBoards = [];
        for (let i = 1; i <= leaderBoards.length; i++) {
            leaderBoards[i - 1].rank = i;
        }
        res.json(leaderBoards);
    });
});
exports.reportScore = functions.https.onRequest((req, res) => {
    let requestUserId = req.body.userId;
    let requestScore = req.body.score;
    admin.database().ref('leaderboards').once('value', function (snapshot) {
        let isExist = false;
        let message = '';
        snapshot.forEach(function (childSnapshot) {
            let userId = childSnapshot.child('userId').val();
            let highScore = childSnapshot.child('highScore').val();
            if (requestUserId === userId) {
                isExist = true;
                if (parseInt(requestScore) > parseInt(highScore)) {
                    childSnapshot.ref.update({
                        highScore: requestScore
                    })
                    message = 'updated score success';
                }else{
                    message = 'score not need update';
                }
            }
        });
        if (!isExist) {
            snapshot.ref.push({
                userId: requestUserId,
                highScore: requestScore
            });
            message = 'added new score to leaderboard';
        }
        return res.json({messsage: message});
    });
});

exports.getTotalPlayers = functions.https.onRequest((req, res) => {
    let userData = admin.database().ref('leaderboards');
    userData.once('value', function (snapshot) {
        let count = 0;
        snapshot.forEach(function (childSnapshot) {
            count++;
        });
        return res.json({totalPlayers: count});
    });
});

exports.getLeaderboardPosition = functions.https.onRequest((req, res) => {
    let requestUserId = req.body.userId;
    let userData = admin.database().ref('leaderboards');
    userData.once('value', function (snapshot) {
        let rank = -1;
        snapshot.forEach(function (childSnapshot) {
            let userId = childSnapshot.child('userId').val();
            if (requestUserId === userId) {
                rank = childSnapshot.child('rank').val();
            }
        });
        res.json({rank: rank});
    });
});

exports.updateRankLeaderBoards = functions.database.ref('/leaderboards/{pushId}/highScore')
    .onWrite(event => {
        admin.database().ref('leaderboards').once('value', function (snapshot) {
            let leaderBoards = [];
            snapshot.forEach(function (childSnapshot) {
                let highScore = childSnapshot.child('highScore').val();
                let userId = childSnapshot.child('userId').val();
                leaderBoards.push({userId: userId, highScore: highScore, childSnapshot : childSnapshot});
            });
            leaderBoards.sort(function (a, b) {
                return parseInt(b.highScore) - parseInt(a.highScore)
            });
            for (let i = 1; i <= leaderBoards.length; i++) {
                leaderBoards[i - 1].rank = i;
            }

            leaderBoards.forEach(function(item){
                item.childSnapshot.ref.update({rank : item.rank});
            });

        });
    });