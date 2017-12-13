/**
 * Created by Mukhtiar.Ahmed on 7/3/2017.
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin')
const database = admin.database();
const moment = require('moment');
const dal = require('./dal');
const utils = require('./utils');
const bucket = admin.storage().bucket();

exports.postScoreForChallenge = function (request, response) {
    var user = request.user;
    var levelId = request.body.challengeId;
    var score = request.body.score;
    var startTime = request.body.startTime;
    var endTime = request.body.endTime;
    if (!levelId || !score || !startTime || !endTime) {
        response.status(400).send(JSON.stringify({'status': 'Bad Request required paramete is missing'}));
        return;
    }


    try {
        score = Number(score);
        dal.getPlayerChallengeScore(user, levelId, function (err, record) {

            if (err) {
                response.status(500).send(JSON.stringify({'status': 'Internal Server error'}));
            } else if (record) {
                dal.addPlayerGameHistory(user, levelId, score, record.BestScore, startTime, endTime);
                if (record.BestScore < score) {
                    record.LastPlayedDateTime = new Date().getTime();
                    record.BestScore = score;
                    dal.updatePlayerScoreForChallenge(user, levelId, record, function (error, result) {
                        if (err) {
                            response.status(500).send(JSON.stringify({'status': 'Internal Server error'}));
                        } else {
                            response.send(JSON.stringify({'status': 'Success'}));
                        }
                    });

                } else {
                    response.send(JSON.stringify({'status': 'Success'}));
                }
            } else {
                dal.getChallengeById(levelId, function (err2, level) {
                    if (err2) {
                        response.status(500).send(JSON.stringify({'status': 'Internal Server error'}));
                    } else if (level) {
                        dal.addPlayerGameHistory(user, levelId, score, 0, startTime, endTime);
                        record = {};
                        record.BestScore = score;
                        record.LastPlayedDateTime = new Date().getTime();
                        record.ChallengeName = level.ChallengeData.DisplayTitle;
                        record.DisplayDescription = level.ChallengeData.DisplayDescription;
                        dal.updatePlayerScoreForChallenge(user, levelId, record, function (error, result) {
                            if (err) {
                                response.status(500).send(JSON.stringify({'status': 'Internal Server error'}));
                            } else {
                                response.status(200).send(JSON.stringify({'status': 'Success'}));
                            }
                        });
                    } else {
                        response.status(404).send(JSON.stringify({'status': 'Challenge Not Found'}));
                    }
                });
            }

        });
    }
    catch (err) {
        console.error(err);
        response.status(500).send(JSON.stringify({'status': 'Internal Server error'}));
    }
};

exports.getLeaderboardPosition = function (request, response) {
    var user = request.user;
    dal.getUserLeaderboardPosition(user, function (error, result) {
        if (result) {
            response.status(200).send(JSON.stringify(result));
        } else {
            response.status(404).send(JSON.stringify({'status': 'Not Found'}));
        }
    });
};

exports.purchaseItem = function (request, response) {
    var user = request.user;
    var inAppPurchaseId = request.body.inAppPurchaseId;
    if (!inAppPurchaseId) {
        response.status(400).send(JSON.stringify({'status': 'Bad Request inAppItemId is missing'}));
        return;
    }

    try {
        var inAppPurchase = dal.getFirebaseData('ShopItem/' + inAppPurchaseId);
        var playerData = dal.getFirebaseData('PlayerData/' + user.uid);
        Promise.all([inAppPurchase, playerData]).then(function (snapshots) {
            inAppPurchase = snapshots[0];
            playerData = snapshots[1];
            if (inAppPurchase) {
                var coins = inAppPurchase.Value;
                var powerUps = inAppPurchase.InAppItem.PowerUps;
                let itemId = powerUps[0].id;
                let itemType = powerUps[0].PowerUpItem.ItemType;

                if (playerData.Coins < coins) {
                    response.status(400).send(JSON.stringify({'status': 'Not Enough Coins'}));
                } else {
                    // check exist
                    let isExists = false;
                    playerData.PowerUps.forEach(function (powerUp) {
                        if(powerUp.id == itemId && (itemType == 'Kit' || itemType == 'Boots')){
                            isExists = true;
                        }
                    });
                    if (!isExists) {
                        playerData.Coins = playerData.Coins - coins;
                        powerUps.forEach(function (powerUp) {
                            var powerUpEffects = powerUp.PowerUpEffects;
                            if (powerUp.PowerUpItem.ItemType == "Coins") {
                                playerData.Coins = Number(playerData.Coins) + Number(powerUpEffects[0].Value);
                            } else {
                                if (!playerData.PowerUps) {
                                    playerData.PowerUps = [];
                                }
                                playerData.PowerUps.push(powerUp);
                            }
                        });

                        dal.updatePlayerData(user, playerData, function (error, result) {
                            if (error) {
                                response.status(500).send(JSON.stringify({'status': 'Internal Server error'}));
                            } else {
                                response.status(200).send(JSON.stringify({'status': 'Success'}));
                            }
                        });
                    }
                    else {
                        response.status(400).send(JSON.stringify({'status': 'Not success - item exist in player data'}));
                    }
                }
            } else {
                response.status(404).send(JSON.stringify({'status': 'Not Found'}));
            }
        });
    } catch (err) {
        console.error(err);
        response.status(500).send(JSON.stringify({'status': 'Internal Server error'}));
    }
};

exports.purchaseSpecialOffer = function (request, response) {
    var user = request.user;
    var inAppPurchaseId = request.body.inAppPurchaseId;
    if (!inAppPurchaseId) {
        response.status(400).send(JSON.stringify({'status': 'Bad Request inAppItemId is missing'}));
        return;
    }

    try {
        var inAppPurchase = dal.getFirebaseData('ShopItemsSpecialOffer/' + inAppPurchaseId);
        var playerData = dal.getFirebaseData('PlayerData/' + user.uid);
        Promise.all([inAppPurchase, playerData]).then(function (snapshots) {
            inAppPurchase = snapshots[0];
            playerData = snapshots[1];
            if (inAppPurchase) {
                var coins = inAppPurchase.Value;
                var powerUps = inAppPurchase.InAppItem.PowerUps;
                let itemId = powerUps[0].id;
                let itemType = powerUps[0].PowerUpItem.ItemType;

                if (playerData.Coins < coins) {
                    response.status(400).send(JSON.stringify({'status': 'Not Enough Coins'}));
                } else {
                    // check exist
                    let isExists = false;
                    playerData.PowerUps.forEach(function (powerUp) {
                        if(powerUp.id == itemId && (itemType == 'Kit' || itemType == 'Boots')){
                            isExists = true;
                        }
                    });
                    if (!isExists) {
                        playerData.Coins = playerData.Coins - coins;
                        powerUps.forEach(function (powerUp) {
                            var powerUpEffects = powerUp.PowerUpEffects;
                            if (powerUp.PowerUpItem.ItemType == "Coins") {
                                playerData.Coins = Number(playerData.Coins) + Number(powerUpEffects[0].Value);
                            } else {
                                if (!playerData.PowerUps) {
                                    playerData.PowerUps = [];
                                }
                                playerData.PowerUps.push(powerUp);
                            }
                        });

                        dal.updatePlayerData(user, playerData, function (error, result) {
                            if (error) {
                                response.status(500).send(JSON.stringify({'status': 'Internal Server error'}));
                            } else {
                                response.status(200).send(JSON.stringify({'status': 'Success'}));
                            }
                        });
                    }
                    else {
                        response.status(400).send(JSON.stringify({'status': 'Not success - item exist in player data'}));
                    }
                }
            } else {
                response.status(404).send(JSON.stringify({'status': 'Not Found'}));
            }
        });
    } catch (err) {
        console.error(err);
        response.status(500).send(JSON.stringify({'status': 'Internal Server error'}));
    }
};

exports.getInAppPurchaseItems = function (request, response) {
    var user = request.user;
    var platform = request.query.platform;
    if (!platform) {
        response.status(400).send(JSON.stringify({'status': 'Bad Request platform is missing'}));
        return;
    }

    try {

        dal.getInAppPurchaseItemsByPlatform(user, platform, function (error, records) {

            if (error) {
                response.status(500).send(JSON.stringify({'status': 'Internal Server error'}));
            } else if (records) {
                var inAppItemIds = [];
                var map = {};
                records = Object.keys(records).map(function (key) {
                    var item = records[key];
                    item.id = key;
                    return item;
                });
                response.status(200).send(JSON.stringify(records));


            } else {
                return response.status(404).send(JSON.stringify([]));
            }
        });

    } catch (err) {
        console.error(err);
        response.status(500).send(JSON.stringify({'status': 'Internal Server error'}));
    }

};

exports.getSpecialOffer = function (request, response) {
    try {
        dal.getAllShopItemSpecialOffers(function (error, records) {
            if (error) {
                response.status(500).send(JSON.stringify({'status': 'Internal Server error'}));
            } else if (records) {
                records = Object.keys(records).map(function (key) {
                    var item = records[key];
                    item.id = key;
                    return item;
                });
                return response.status(200).send(JSON.stringify(records));
            } else {
                return response.status(404).send(JSON.stringify([]));
            }
        });
    }
    catch (err) {
        console.error(err);
        response.status(500).send(JSON.stringify({'status': 'Internal Server error'}));
    }
};

exports.storePurchase = function (request, response) {
    var user = request.user;
    var inAppPurchaseId = request.body.inAppPurchaseId;

    if (!inAppPurchaseId) {
        response.status(400).send(JSON.stringify({'status': 'Bad Request inAppPurchaseId is required '}));
        return;
    }

    try {

        dal.getInAppPurchaseById(inAppPurchaseId, function (error, record) {

            if (error) {
                return response.status(500).send(JSON.stringify({'status': 'Internal Server error'}));
            } else if (record) {
                var inAppPurchase = dal.getFirebaseData('ShopItem/' + inAppPurchaseId);
                var playerData = dal.getFirebaseData('PlayerData/' + user.uid);
                Promise.all([inAppPurchase, playerData]).then(function (snapshots) {

                    inAppPurchase = snapshots[0];
                    playerData = snapshots[1];
                    if (inAppPurchase) {
                        inAppPurchase.InAppItem.PowerUps.forEach(function (powerUp) {
                            var powerUpEffects = powerUp.PowerUpEffects;
                            if (powerUp.PowerUpItem.ItemType == "Coins") {
                                playerData.Coins = Number(playerData.Coins) + Number(powerUpEffects[0].Value);
                            } else {
                                if (!playerData.PowerUps) {
                                    playerData.PowerUps = [];
                                }
                                playerData.PowerUps.push(powerUp);
                            }
                        });

                        dal.updatePlayerData(user, playerData, function (error, res) {
                            if (error) {
                                response.status(500).send(JSON.stringify({'status': 'Internal Server error'}));
                            } else {
                                response.status(200).send(JSON.stringify({'status': 'Success'}));
                            }
                        });
                    } else {
                        response.status(404).send(JSON.stringify({'status': 'Not Found'}));
                    }

                });

            } else {
                response.status(404).send(JSON.stringify({'status': 'Not Found'}));
            }

        });

    } catch (err) {
        console.error(err);
        response.status(500).send(JSON.stringify({'status': 'Internal Server error'}));
    }

};


exports.getCoins = function (request, response) {
    var user = request.user;

    dal.getUserPlayerData(user, function (error, result) {
        if (error) {
            response.status(500).send(JSON.stringify({'status': 'Internal Server error'}));
        } else if (result) {
            response.status(200).send(JSON.stringify({"Coins": result.Coins}));
        } else {
            response.status(200).send(JSON.stringify({"Coins": 0}));
        }
    });
};


exports.getPlayer = function (request, response) {
    response.status(200).send(JSON.stringify(request.user));
};

exports.getPowerUps = function (request, response) {
    var user = request.user;
    dal.getUserPlayerData(user, function (error, result) {
        if (error) {
            response.status(500).send(JSON.stringify({'status': 'Internal Server error'}));
        } else if (result) {
            response.status(200).send(JSON.stringify({"PowerUps": result.PowerUps}));
        } else {
            response.status(404).send(JSON.stringify({'status': 'Not Found'}));
        }
    });

};

exports.getPowerUpsOfType = function (request, response) {
    var user = request.user;
    var itemType = request.query.itemType;
    if (!itemType) {
        response.status(400).send(JSON.stringify({'status': 'Bad Request itemType is missing'}));
        return;
    }

    try {
        dal.getUserPowerUpsByItemType(user, itemType, function (error, data) {
            if (error) {
                response.status(500).send(JSON.stringify({'status': 'Internal Server error'}));
            } else {
                response.status(200).send(JSON.stringify(data));
            }
        });
    } catch (err) {
        console.error(err);
        response.status(500).send(JSON.stringify({'status': 'Internal Server error'}));
    }

}

exports.usePowerUp = function (request, response) {
    var user = request.user;
    var id = request.body.id;
    if (!id) {
        response.status(400).send(JSON.stringify({'status': 'Bad Request id is missing'}));
        return;
    }

    dal.getUserPlayerData(user, function (error, playerData) {
        if (error) {
            response.status(500).send(JSON.stringify({'status': 'Internal Server error'}));
        } else if (playerData && playerData.PowerUps) {
            var powerUps = [];
            var found = false;
            var records = playerData.PowerUps
            records.forEach(function (powerUp) {
                if (id == powerUp.id && !found) {
                    found = true;
                } else {
                    powerUps.push(powerUp);
                }
            });
            if (found) {
                playerData.PowerUps = powerUps;
                dal.updatePlayerData(user, playerData, function (error, result) {
                    if (error) {
                        response.status(500).send(JSON.stringify({'status': 'Internal Server error'}));
                    } else {
                        response.status(200).send(JSON.stringify({'status': 'Success'}));
                    }
                });
            } else {
                response.status(404).send(JSON.stringify({'status': 'Not Found'}));
            }

        } else {
            response.status(404).send(JSON.stringify({'status': 'Not Found'}));
        }
    });
};


exports.rewardPlayer = function (request, response) {
    var user = request.user;
    var numberOfCoins = request.body.numberOfCoins;
    if (!numberOfCoins || isNaN(numberOfCoins) || Number(numberOfCoins) <= 0) {
        response.status(400).send(JSON.stringify({'status': 'Bad Request numberOfCoins is missing or invalid value'}));
        return;
    }

    dal.getUserPlayerData(user, function (error, playerData) {
        if (error) {
            response.status(500).send(JSON.stringify({'status': 'Internal Server error'}));
        } else if (playerData) {
            playerData.Coins = Number(playerData.Coins) + Number(numberOfCoins);
            dal.updatePlayerData(user, playerData, function (error, res) {
                if (error) {
                    response.status(500).send(JSON.stringify({'status': 'Internal Server error'}));
                } else {
                    response.status(200).send(JSON.stringify({'status': 'Success'}));
                }
            });
        } else {
            response.status(404).send(JSON.stringify({'status': 'Not Found'}));
        }
    });

};

exports.setUserProfile = function (request, response) {
    var user = request.user;
    var firstName = request.body.FirstName;
    var lastName = request.body.LastName;
    var maybankToken = request.body.Maybank_token;
    var playerCountry = request.body.Player_Country;
    var playerTier = request.body.Player_Tier;
    var telephone = request.body.Telephone;
    var userName = request.body.UserName;
    try {
        dal.getUserProfileData(user, function (error, data) {
            if (error) {
                response.status(500).send(JSON.stringify({'status': 'Internal Server error'}));
            } else {
                if (!data) {
                    data = {};
                }
                if (firstName) {
                    data.FirstName = firstName;
                }

                if (lastName) {
                    data.LastName = lastName;
                }

                if (maybankToken) {
                    data.Maybank_token = maybankToken;
                }
                if (playerCountry) {
                    data.Player_Country = playerCountry;
                }
                if (playerTier) {
                    data.Player_Tier = playerTier;
                }
                if (telephone) {
                    data.Telephone = telephone;
                }
                if (userName) {
                    data.UserName = userName;
                }
                if (telephone) {
                    data.Telephone = telephone;
                }

                dal.updateUserProfileData(user, data, function (error, result) {
                    if (error) {
                        response.status(500).send(JSON.stringify({'status': 'Internal Server error'}));
                    } else {
                        response.status(200).send(JSON.stringify(result));
                    }
                });


            }
        });
    } catch (err) {
        console.error(err);
        response.status(500).send(JSON.stringify({'status': 'Internal Server error'}));
    }

};


exports.getUserProfile = function (request, response) {
    //var user = request.user;
    var user = request.user;
    try {
        dal.getUserProfileData(user, function (error, data) {
            if (error) {
                response.status(500).send(JSON.stringify({'status': 'Internal Server error'}));
            } else {
                dal.getUserPlayerData(user, function (error, playerData) {
                    if (error) {
                        response.status(500).send(JSON.stringify({'status': 'Internal Server error'}));
                    } else {
                        if (!data) {
                            data = {};
                        }
                        if (playerData.Coins) {
                            data.Coins = playerData.Coins;
                        } else {
                            data.Coins = 0;
                        }

                        if (playerData.PowerUps) {
                            data.PowerUps = playerData.PowerUps;
                        } else {
                            data.PowerUps = [];
                        }

                        if (playerData.ProgressStats.CurrentLeaderboard) {
                            data.DivisionType = playerData.ProgressStats.CurrentLeaderboard;
                        } else {
                            data.DivisionType = 'bronze';
                        }

                        response.status(200).send(JSON.stringify(data));
                    }

                });
            }
        });
    } catch (err) {
        console.error(err);
        response.status(500).send(JSON.stringify({'status': 'Internal Server error'}));
    }

};

exports.eraseMaybankToken = function (request, response) {
    var user = request.user;
    try {
        dal.getUserProfileData(user, function (error, data) {
            if (error) {
                response.status(500).send(JSON.stringify({'status': 'Internal Server error'}));
            } else {
                if (!data) {
                    data = {};
                }
                data.Maybank_token = "";
                dal.updateUserProfileData(user, data, function (error, result) {
                    if (error) {
                        response.status(500).status(200).send(JSON.stringify({'status': 'Internal Server error'}));
                    } else {
                        response.status(200).send(JSON.stringify(result));
                    }
                });
            }
        });
    } catch (err) {
        console.error(err);
        response.status(500).send(JSON.stringify({'status': 'Internal Server error'}));
    }
};

exports.registerUser = function (request, response) {

    try {

        admin.auth().createUser({
            email: "ahmed@gmail.com",
            emailVerified: false,
            phoneNumber: "+923002610463",
            password: "cubix123",
            displayName: "Ahmed",
            photoURL: "https://media.licdn.com/mpr/mpr/shrinknp_400_400/p/3/000/097/0c1/134a5e5.jpg",
            disabled: false
        })
            .then(function (userRecord) {
                // See the UserRecord reference doc for the contents of userRecord.
                console.log("Successfully created new user:", userRecord.uid);
                response.status(201).send(JSON.stringify(userRecord));
            })
            .catch(function (error) {
                // Handle Errors here.
                var errorCode = error.code;
                var errorMessage = error.message;
                console.log("Error creating new user:", error);
            });

    } catch (err) {
        console.error(err);
        response.status(500).send(JSON.stringify({'status': 'Internal Server error'}));
    }

};

exports.getVoucherReward = function (req, res) {
    try {
        let voucherCode = req.body.voucherCode;
        if (!voucherCode) {
            let result = ({
                resultCode: 'NN',
                result: "voucher code invalid"
            });
            return res.status(200).send(JSON.stringify((result)));
        }
        database.ref('VoucherHistory').once('value', function (snapshot) {
            let voucherHistory = snapshot.val() ? snapshot.val() : {};
            if (voucherHistory && voucherHistory[voucherCode]) {
                let result = ({
                    resultCode: 'NN',
                    result: "voucher code has been used"
                });
                return res.status(200).send(JSON.stringify((result)));
            }
            database.ref('UserProfile/' + req.user.uid).once('value', function (snapshotUserProfile) {
                let userData = snapshotUserProfile.val();
                let country = userData.Player_Country;
                if (!country || country == '') {
                    let result = ({
                        resultCode: 'NN',
                        result: "country invalid"
                    });
                    return res.status(200).send(JSON.stringify((result)));
                }

                let file = bucket.file('voucher.txt');
                file.createReadStream()
                    .on('data', function (response) {
                        // do stuff
                        let voucher = response.toString('ascii').split("\r\n").filter((line) => {
                            return (line.split("|")[0] == country) && (line.split("|")[1] == voucherCode);
                        });
                        let result;
                        if (voucher.length == 0) {
                            result = ({
                                resultCode: 'NN',
                                result: "voucher code not found"
                            });
                        } else if (voucher.length > 1) {
                            result = ({
                                resultCode: 'NN',
                                result: 'data invalid, duplicated voucher in server'
                            });
                        } else {
                            voucherHistory[voucherCode] = {
                                playerUse: req.user.uid,
                                country: voucher[0].split("|")[0],
                                voucherCode: voucher[0].split("|")[1],
                                coin: voucher[0].split("|")[2],
                                time: moment().utcOffset(480).format('YYYYMMDD-HHmmss')
                            };
                            snapshot.ref.update(voucherHistory);

                            database.ref('PlayerData/' + req.user.uid).once('value', function (snapshotPlayerData) {
                                let playerData = snapshotPlayerData.val();
                                let coin = playerData.Coins ? playerData.Coins : 0;
                                playerData.Coins = coin + parseInt(voucher[0].split("|")[2]);
                                snapshotPlayerData.ref.update(playerData);
                            });

                            result = ({
                                resultCode: '00',
                                result: 'success',
                                coinAdded: voucher[0].split("|")[2]
                            });
                        }
                        return res.status(200).send(JSON.stringify((result)));
                    });
            });
        });
    } catch (err) {
        console.error(err);
        res.status(500).send(JSON.stringify({'status': 'Internal Server error'}));
    }
};










