/**
 * Created by Mukhtiar.Ahmed on 7/3/2017.
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin')
const database = admin.database();
const moment = require('moment');
const dal = require('./dal');
const utils = require('./utils');
const xlsxtojson = require("xlsx-to-json-depfix");
const path = require('path');
const os = require('os');
const fs = require('fs');
const readline = require('readline');
const stream = require('stream');
const bucket = admin.storage().bucket();
const sha256 = require('js-sha256');
const _ = require('underscore');

exports.findGameTypeById = function(request, response) {
    var key = request.params.id;
    if(!key) {
        response.status(400).send(JSON.stringify({'status' : 'Bad Request'}));
        return;
    }
    try {
        Promise.all([dal.findGameTypeByKey(key)]).then(function(data) {
            var result = data[0];
            if(result) {
                response.status(200).send(JSON.stringify(result));
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

exports.getLeaderboardTotalPlayers = function(request, response) {
    var user = request.user;

    try {
        Promise.all([dal.getLeaderboardPlayersCount(user.uid)]).then(function(data) {
            var result = data[0];
            if(result) {
                response.status(200).send(JSON.stringify(result));
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

exports.addPowerUpItem = function(request, response) {
            if(!request.body) {
                response.status(400).send(JSON.stringify({'status' : 'Bad Request'}));
                return;
            }
            var key = database.ref().child('PowerUpItem').push().key;
            var updates = {};
            updates['/PowerUpItem/' + key] = request.body;

            database.ref().update(updates).then(function(){
                response.status(200).send(JSON.stringify({'PowerUpItemKey' :key}));
            }).catch(function(error) {
                response.status(500).send(JSON.stringify({'status' : 'Internal Server Error'}));
            });

};

exports.addPowerUpEffect = function(request, response) {
    if(!request.body) {
        response.status(400).send(JSON.stringify({'status' : 'Bad Request'}));
        return;
    }
    var key = database.ref().child('PowerUpEffect').push().key;
    var updates = {};
    updates['/PowerUpEffect/' + key] = request.body;

    database.ref().update(updates).then(function(){
        response.status(200).send(JSON.stringify({'PowerUpEffectKey' :key}));
    }).catch(function(error) {
        response.status(500).send(JSON.stringify({'status' : 'Internal Server Error'}));
    });

};

exports.addPowerUp = function(request, response) {
    if(!request.body) {
        response.status(400).send(JSON.stringify({'status' : 'Bad Request'}));
        return;
    }
    var key = database.ref().child('PowerUp').push().key;
    var updates = {};
    updates['/PowerUp/' + key] = request.body;

    database.ref().update(updates).then(function(){
        response.status(200).send(JSON.stringify({'PowerUpKey' :key}));
    }).catch(function(error) {
        response.status(500).send(JSON.stringify({'status' : 'Internal Server Error'}));
    });

};


exports.addInAppItem = function(request, response) {
    if(!request.body) {
        response.status(400).send(JSON.stringify({'status' : 'Bad Request'}));
        return;
    }
    var key = database.ref().child('InAppItem').push().key;
    var updates = {};
    updates['/InAppItem/' + key] = request.body;

    database.ref().update(updates).then(function(){
        response.status(200).send(JSON.stringify({'InAppItemKey' :key}));
    }).catch(function(error) {
        response.status(500).send(JSON.stringify({'status' : 'Internal Server Error'}));
    });

};

exports.addInAppPurchase = function(request, response) {
    if(!request.body || !request.body.inAppItemId || !request.body.Platform || !request.body.BundleId) {
        response.status(400).send(JSON.stringify({'status' : 'Bad Request'}));
        return;
    }

    try {

        var record =  request.body;
        dal.getInAppItem(request.body.inAppItemId, function(error, inAppItem) {

            if (error) {
                response.status(500).send(JSON.stringify({'status' : 'Internal Server error'}));
            } else if(inAppItem) {
                var key = database.ref().child('InAppPurchases').push().key;
                var updates = {};
                record.InAppItem = inAppItem;
                record.InAppItemId = record.inAppItemId;
                delete record.inAppItemId;
                updates['/InAppPurchases/' + key] = record;
                database.ref().update(updates);
                response.status(200).send(JSON.stringify({'InAppPurchasesId' :key}));
            } else {
                return response.status(404).send(JSON.stringify([]));
            }
        });

    } catch(err) {
        console.error(err);
        response.status(500).send(JSON.stringify({'status' : 'Internal Server error'}));
    }

};


exports.getShopItems = function(request, response) {
    try {
        dal.getAllShopItems(function(error, records) {
            if (error) {
                response.status(500).send(JSON.stringify({'status' : 'Internal Server error'}));
            } else if(records) {
                records =  Object.keys(records).map(function(key) {
                    var item =  records[key];
                    item.id = key;
                    return item;
                });
                return response.status(200).send(JSON.stringify(records));
            } else {
                return response.status(404).send(JSON.stringify([]));
            }
        });
    }
    catch(err) {
        console.error(err);
        response.status(500).send(JSON.stringify({'status' : 'Internal Server error'}));
    }

};


/** API path that will upload the files */
exports.dataImport = function(request, response, next) {
    var exceltojson; //Initialization
    /** Multer gives us file info in request.file object */
    if(!request.files.xslfile){
        response.json({"status":"No file passed"});
        return;
    }

    const xslfile = request.files.xslfile;
    const filename = xslfile.name;
    const tempFilePath = path.join(os.tmpdir(), filename);

    if(filename.split('.')[filename.split('.').length-1] === 'xlsx'){
        exceltojson = xlsxtojson;
    }  else {
        response.json({"status":"Invalid file format"});
        return;
    }

    xslfile.mv(tempFilePath, function(err) {
        if (err) {
            return response.status(500).send(err);
        }

       const  sheetsData = {};
       utils.readExcelSheet(exceltojson, tempFilePath, 'CountryDialCode',  function(error, records) {
           sheetsData['CountryDialCode'] = records;
       });

        utils.readExcelSheet(exceltojson, tempFilePath, 'DivisionType',  function(error, records) {
            sheetsData['DivisionType'] = records;
        });

        utils.readExcelSheet(exceltojson, tempFilePath, 'GameSettings',  function(error, records) {
            sheetsData['GameSettings'] = records;
        });

        utils.readExcelSheet(exceltojson, tempFilePath, 'Challenge',  function(error, records) {
            sheetsData['Challenge'] = records;
        });

        utils.readExcelSheet(exceltojson, tempFilePath, 'GameTypes',  function(error, records) {
            sheetsData['GameTypes'] = records;
        });

        utils.readExcelSheet(exceltojson, tempFilePath, 'PlayType',  function(error, records) {
            sheetsData['PlayType'] = records;
        });

        utils.readExcelSheet(exceltojson, tempFilePath, 'PowerUp',  function(error, records) {
            sheetsData['PowerUp'] = records;
        });

        utils.readExcelSheet(exceltojson, tempFilePath, 'PowerUpType',  function(error, records) {
            sheetsData['PowerUpType'] = records;
        });

        utils.readExcelSheet(exceltojson, tempFilePath, 'PowerUpEffect',  function(error, records) {
            sheetsData['PowerUpEffect'] = records;
        });

        utils.readExcelSheet(exceltojson, tempFilePath, 'EffectType',  function(error, records) {
            sheetsData['EffectType'] = records;
        });

        utils.readExcelSheet(exceltojson, tempFilePath, 'InAppPurchases',  function(error, records) {
            sheetsData['InAppPurchases'] = records;
        });

        utils.readExcelSheet(exceltojson, tempFilePath, 'InAppItem',  function(error, records) {
            sheetsData['InAppItem'] = records;
        });

        utils.readExcelSheet(exceltojson, tempFilePath, 'Platform',  function(error, records) {
            sheetsData['Platform'] = records;
        });

        utils.readExcelSheet(exceltojson, tempFilePath, 'TriviaQuestions',  function(error, records) {
            sheetsData['TriviaQuestions'] = records;
        });

        utils.readExcelSheet(exceltojson, tempFilePath, 'TriviaAnswers',  function(error, records) {
            sheetsData['TriviaAnswers'] = records;
        });

        utils.readExcelSheet(exceltojson, tempFilePath, 'ShopItems',  function(error, records) {
            sheetsData['ShopItems'] = records;
        });

        utils.readExcelSheet(exceltojson, tempFilePath, 'CoinValues',  function(error, records) {
            sheetsData['CoinValues'] = records;
        });

        utils.readExcelSheet(exceltojson, tempFilePath, 'Reward',  function(error, records) {
            sheetsData['Reward'] = records;
        });

        utils.readExcelSheet(exceltojson, tempFilePath, 'RewardRelease',  function(error, records) {
            sheetsData['RewardRelease'] = records;
        });

        utils.readExcelSheet(exceltojson, tempFilePath, 'RewardType',  function(error, records) {
            sheetsData['RewardType'] = records;
        });

        utils.readExcelSheet(exceltojson, tempFilePath, 'ChallengeTitle',  function(error, records) {
            sheetsData['ChallengeTitle'] = records;
        });

        utils.readExcelSheet(exceltojson, tempFilePath, 'ChallengeData',  function(error, records) {
            sheetsData['ChallengeData'] = records;
        });


        utils.readExcelSheet(exceltojson, tempFilePath, 'EnviromentalName',  function(error, records) {
            sheetsData['EnviromentalName'] = records;
        });

        utils.readExcelSheet(exceltojson, tempFilePath, 'PowerUpItem',  function(error, records) {
            sheetsData['PowerUpItem'] = records;
            dal.gameDataImport(sheetsData, function(error, records) {
               return response.send(JSON.stringify(records));

            });

        });

    });

};

exports.getServerInfo = function(request, response) {
    try {
        database.ref('ServerInfo').once('value').then(function (snapshot) {
            let serverInfo = snapshot.val();
            if(serverInfo){
                 serverInfo.status = "success"
             }else{
                serverInfo = {};
                serverInfo.status = "can't get server info"
            }
            return response.status(200).send(JSON.stringify(serverInfo));
        });
    } catch(err) {
        console.error(err);
        response.status(500).send(JSON.stringify({'status' : 'Internal Server error'}));
    }
};

exports.getTriviaQuestion = function(request, response) {
    try {
        let numberQuestion = _.isFinite(request.query.numberQuestion) ? parseInt(request.query.numberQuestion) : 60;
        // create list request
        let listQuestionId = [];
        for(let i =1; i <=numberQuestion; i++ ){
            let questionId = _.random(1,200);
            while(_.contains(listQuestionId, questionId)){
                questionId = _.random(1,200);
            }
            listQuestionId.push(questionId);
        }

        // get file from bucget
        let file = bucket.file('TriviaQuestion.txt');
        var instream = file.createReadStream();
        var outstream = new stream;
        outstream.readable = true;
        outstream.writable = true;

        var rl = readline.createInterface({
            input: instream,
            output: outstream,
            terminal: false
        });
        let result = {};
        rl.on('line', function(line) {
                let questionObj = {
                    Q: {},
                    A: [],
                };
                let id = line.split("|")[0];
                if(_.contains(listQuestionId, parseInt(id))){
                    if(!result[id]){
                        result[id] = questionObj;
                    }
                    let type = line.split("|")[1];
                    if(type == 'Q'){
                        result[id]['Q'] =
                            {
                                "id": id,
                                "content": line.split("|")[2]
                            }
                    } else if(type == 'A'){
                        let answerId = line.split("|")[2];
                        let sv = "21021994";
                        let correctValue = line.split("|")[4];
                        let sha256String = sha256(sv + id + answerId + correctValue);
                        let correct = sha256String.toString().substr(0, 20).toUpperCase();
                        let answer = {
                            id: answerId,
                            content: line.split("|")[3],
                            correct: correct
                        };
                        result[id]['A'].push(answer)
                    }
                }
            }).on('close', function() {
                let finalResult = [];
                listQuestionId.map((id)=>{
                    finalResult.push(result[id])
                });
                console.log(finalResult)
                // Object.keys(result).map((question)=>{
                //     finalResult.push(result[question])
                // });
                return response.status(200).send(finalResult);
        });;





        // file.createReadStream()
        //     .on('data', function (res) {
        //         let result = {};
        //         let questions = res.toString('ascii').split("\r\n");
        //         console.log(res)
        //         questions.map((question)=>{
        //             let questionObj = {
        //                 Q: "",
        //                 A: [],
        //             };
        //             let id = question.split("|")[0];
        //             if(!result[id]){
        //                 result[id] = questionObj;
        //             }
        //             let type = question.split("|")[1];
        //             if(type == 'Q'){
        //                 result[id]['Q'] = question.split("|")[2]
        //             } else if(type == 'A'){
        //                 let answer = {
        //                     content: question.split("|")[2],
        //                     correct: question.split("|")[3]
        //                 };
        //                 result[id]['A'].push(answer)
        //             }
        //         });
        //         // if (cardItem.length > 0) {
        //         //     dal.getUserProfileData(req.user, function (error, data) {
        //         //         if (error) {
        //         //             console.log(error)
        //         //         } else {
        //         //             if (!data) {
        //         //                 data = {};
        //         //             }
        //         //             data.MaybankLoggedIn = true;
        //         //             dal.updateUserProfileData(req.user, data, function (error, result) {
        //         //                 if (error) {
        //         //                     console.log("set data error when login MY")
        //         //                 } else {
        //         //                     console.log("set MaybankLoggedIn success when login MY")
        //         //                 }
        //         //             });
        //         //         }
        //         //     });
        //         //     result.resultCode = '00';
        //         //     result.result = 'success';
        //         // }
        //         this.end();
        //         //console.log(JSON.stringify(result))
        //         return response.status(200).send(result);
        //     });
    } catch (err) {
        console.error(err);
        return response.status(500).send(JSON.stringify({'status': 'Internal Server error'}));
    }
};





