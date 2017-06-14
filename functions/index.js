// The Cloud Functions for Firebase SDK to create Cloud Functions and setup triggers.
const functions = require('firebase-functions');

// The Firebase Admin SDK to access the Firebase Realtime Database. 
const admin = require('firebase-admin');
admin.initializeApp(functions.config().firebase);

// Take the text parameter passed to this HTTP endpoint and insert it into the
// Realtime Database under the path /messages/:pushId/original
exports.leaderboards = functions.https.onRequest((req, res) => {
    // Grab the text parameter.
    //const original = req.query.text;
    // Push the new message into the Realtime Database using the Firebase Admin SDK.

    let object = admin.database().ref().child('leaderboards');
    object.once('value', function (snapshot) {
        let leaderBoards = [];
        snapshot.forEach(function (childSnapshot) {
                let highScore = childSnapshot.child('highScore').val();
                let name = childSnapshot.child('name').val();
                leaderBoards.push({userId: childSnapshot.key, highScore : highScore, name: name});
        //     // });
        //     let userScore = childSnapshot.parent;
        //     let highScore = childSnapshot.val();
        //     let name = userScore.child('name').val();
        //     leaderBoards.push({userId: userScore.key, highScore: highScore, name: name});
        });
        leaderBoards.sort(function (a,b) {
           return parseInt(b.highScore) - parseInt(a.highScore)
        });
        let rankBoards = [];
        for(let i = 1; i <=leaderBoards.length; i++){
            leaderBoards[i-1].rank = i;
        }
        res.json(leaderBoards);
    });
    //res.json(leaderBoards);
    //res.render({leaderBoards:leaderBoards})
    // admin.database().ref('/messages').push({original: original}).then(snapshot => {
    //     // Redirect with 303 SEE OTHER to the URL of the pushed object in the Firebase console.
    //     res.redirect(303, snapshot.ref);
    // });
});

// Listens for new messages added to /messages/:pushId/original and creates an
// uppercase version of the message to /messages/:pushId/uppercase
// exports.makeUppercase = functions.database.ref('/messages/{pushId}/original')
//     .onWrite(event => {
//         // Grab the current value of what was written to the Realtime Database.
//         const original = event.data.val();
//         console.log('Uppercasing', event.params.pushId, original);
//         const uppercase = original.toUpperCase();
//         // You must return a Promise when performing asynchronous tasks inside a Functions such as
//         // writing to the Firebase Realtime Database.
//         // Setting an "uppercase" sibling in the Realtime Database returns a Promise.
//         return event.data.ref.parent.child('uppercase').set(uppercase);
//     });