/**
 * Created by Mukhtiar.Ahmed on 6/22/2017.
 */
const functions = require('firebase-functions');
const admin = require('firebase-admin')
const database = admin.database();
const utils = require('./utils');
const moment = require('moment');
/**
 * Get Firebase data of give endpoint
 * @param endpoint
 * @returns {*}
 */
exports.getFirebaseData = function (endpoint) {
    return database.ref(endpoint).once("value").then(function (snapshot) {
        return snapshot.val();
    });
};

exports.getLeaderBoardData = function (endpoint) {
    return database.ref(endpoint).limitToLast(50).once("value").then(function (snapshot) {
        return snapshot.val();
    });
};

exports.backupLeaderBoardData = function (dateStr) {
    database.ref('Leaderboard').once("value").then(function (snapshot) {
        database.ref('LeaderboardHistory').once("value").then(function (snapshotLeaderboardHistory) {
            let leaderboardHistory = snapshotLeaderboardHistory.val() ? snapshotLeaderboardHistory.val() : {};
            leaderboardHistory[dateStr] = snapshot.val();
            snapshotLeaderboardHistory.ref.set(leaderboardHistory);
        });
    });
};

exports.getLeaderBoardWithType = function (divisionType) {
    return database.ref('Leaderboard/' + divisionType).once("value").then(function (snap) {
        let data = [];
        snap.forEach((item) => {
            let newItem = item.val();
            newItem.key = item.key;
            data.push(newItem);
        });
        data.sort((a, b) => {
            if (a.TotalScore < b.TotalScore)
                return 1;
            if (a.TotalScore > b.TotalScore)
                return -1;
            return 0;
        });

        let promotionData = [];
        let demotionData = [];
        let keepPositionData = [];
        let numberPerson = Math.floor(data.length / 4);
        data.map((item, idx) => {
            let rank = idx + 1;
            if(data.length <3){
                keepPositionData.push(item);
            }else{
                if(rank <= numberPerson){
                    promotionData.push(item);
                }else if(rank >= data.length - numberPerson + 1){
                    demotionData.push(item)
                } else {
                    keepPositionData.push(item);
                }
            }
        });
        return {
            promotionData: promotionData,
            demotionData: demotionData,
            keepPositionData: keepPositionData,
            numberPerson : data.length
        };
    });
};

/**
 * Get challenges by ids.
 * @param levelIds
 * @param callback
 * @returns {any|*}
 */
exports.loadLevels = function (levelIds, callback) {
    Promise.all(
        levelIds.map(id => database.ref('Levels').child(id).once('value').then(snapshot => {
            var level = snapshot.val();
            if (level) level.id = id;
            return level;
        }))
    ).then(r => callback(r));
};

/**
 * Get GemeType by ids.
 * @param gameTypeIds
 * @param callback
 * @returns {any|*}
 */
exports.loadGameTypes = function (gameTypeIds, callback) {

    Promise.all(
        gameTypeIds.map(id => database.ref('GameType').child(id).once('value').then(snapshot => {
            var gameType = snapshot.val();
            if (gameType) gameType.id = id;
            return gameType;
        }))
    ).then(r => callback(r));
};
/**
 * Get powerup by ids.
 * @param PowerUpIds
 * @param callback
 * @returns {any|*}
 */
exports.loadPowerUps = function (PowerUpIds, callback) {
    Promise.all(
        PowerUpIds.map(id => database.ref('PowerUp').child(id).once('value').then(snapshot => {
            var powerUp = snapshot.val();
            if (powerUp) powerUp.id = id;
            return powerUp;
        }))
    ).then(r => callback(r));
};
/**
 * Get all powerup effect by ids
 * @param powerUpEffectIds
 * @param callback
 * @returns {any|*}
 */
exports.loadPowerUpEffects = function (powerUpEffectIds, callback) {
    Promise.all(
        powerUpEffectIds.map(id => database.ref('PowerUpEffect').child(id).once('value').then(snapshot => {
            var powerUpEffect = snapshot.val();
            if (powerUpEffect) powerUpEffect.id = id;
            return powerUpEffect;
        }))
    ).then(r => callback(r));
};

/**
 * Get All Powerup Item based on ids.
 * @param powerUpItemIds
 * @param callback
 * @returns {any|*}
 */
exports.loadPowerUpItems = function (powerUpItemIds, callback) {
    Promise.all(
        powerUpItemIds.map(id => database.ref('PowerUpItem').child(id).once('value').then(snapshot => {
            var powerUpItem = snapshot.val();
            if (powerUpItem) powerUpItem.id = id;
            return powerUpItem;
        }))
    ).then(r => callback(r));
};


exports.loadPlayerScores = function (user, levelIds, callback) {

    Promise.all(
        levelIds.map(id => database.ref('PlayerScore/' + user.uid).child(id).once('value').then(snapshot => {
            var playerScore = snapshot.val();
            if (playerScore) playerScore.id = id;
            return playerScore;
        }))
    ).then(r => callback(r));
};


/**
 * Get Game type by id.
 * @param key
 * @returns {*}
 */
exports.findGameTypeByKey = function (key) {
    return database.ref('GameType/' + key).once("value").then(function (snapshot) {
        return snapshot.val();
    });
};

/**
 * Get Total player count base of user leader board.
 * @param userId
 * @returns {*}
 */
exports.getLeaderboardPlayersCount = function (userId) {
    return database.ref('PlayerData/' + userId).once('value').then(function (snapshot) {

        var record = snapshot.val();
        if (record) {
            var playerDivision = record.ProgressStats.CurrentLeaderboard;
            return database.ref('Leaderboard/' + playerDivision).once("value").then(function (snap) {
                return {"TotalPlayers": snap.numChildren()};
            });
        } else {
            return record;
        }
    });

};

/**
 * Get Current Weekly challenges.
 * @param startOfWeekTime
 * @returns {*}
 */
exports.getCurrentWeeklyChallenges = function (currentTime) {
    console.log(currentTime);
    return database.ref('Challenge').orderByChild('EndDate').startAt(currentTime)
        .limitToFirst(5).once("value").then(function (snapshot) {
            return snapshot.val();
        });
};

/**
 * Get Current Weekly challenges.
 * @param startOfWeekTime
 * @returns {*}
 */
exports.getTopPlayers = function (divisionType) {
    return database.ref('Leaderboard/' + divisionType).orderByChild('TotalScore')
        .limitToFirst(50).once('value').then(function (snapshot) {
            return snapshot.val();
        });
};

/**
 * Get Challenge by id.
 * @param levelId
 * @param callback
 */
exports.getChallengeById = function (levelId, callback) {
    database.ref('Challenge').child(levelId).once('value').then(function (snapshot) {
        return callback(null, snapshot.val());
    }, function (error) {
        console.log(error);
        return callback(error, null);
    });
};

/**
 * Get All shop item.
 * @param levelId
 * @returns {*}
 */
exports.getAllShopItems = function (callback) {
    return database.ref('ShopItem').once('value').then(function (snapshot) {
        return callback(null, snapshot.val());
    }, function (error) {
        console.log(error);
        return callback(error, null);
    });
};


/**
 * Get All shop item.
 * @param levelId
 * @returns {*}
 */
exports.getInAppItem = function (inAppItemId, callback) {
    database.ref('/InAppItem/' + inAppItemId).once('value').then(function (snapshot) {
        var record = snapshot.val();

        if (record) {
            record.id = inAppItemId;
            exports.loadPowerUps(record.PowerUps, function (powerUps) {
                record.PowerUps = powerUps;
                var powerUpEffectIds = [];
                var powerUpItemIds = [];
                powerUps.forEach(function (powerUp) {
                    if (powerUp) {
                        powerUpEffectIds = powerUpEffectIds.concat(powerUp.PowerUpEffects);
                        powerUpItemIds.push(powerUp.PowerUpItem);
                    }
                });

                powerUpEffectIds = utils.unique(powerUpEffectIds);
                powerUpItemIds = utils.unique(powerUpItemIds);


                exports.loadPowerUpItems(powerUpItemIds, function (powerUpItems) {
                    var powerUpItemMap = [];
                    var powerUpEffectMap = [];

                    powerUpItems.forEach(function (item) {
                        powerUpItemMap[item.id] = item;
                    });

                    exports.loadPowerUpEffects(powerUpEffectIds, function (powerUpEffects) {
                        powerUpEffects.forEach(function (item) {
                            powerUpEffectMap[item.id] = item;
                        });

                        record.PowerUps.forEach(function (powerUp) {
                            if (powerUp) {
                                powerUpEffects = [];
                                powerUp.PowerUpEffects.forEach(function (effectId) {
                                    powerUpEffects.push(powerUpEffectMap[effectId]);
                                });
                                powerUp.PowerUpEffects = powerUpEffects;
                                powerUp.PowerUpItem = powerUpItemMap[powerUp.PowerUpItem];
                            }
                        });

                        return callback(null, record);
                    });
                });
            });

        } else {
            return callback('InAppItem Not Found', null);
        }


    }, function (error) {
        console.log(error);
        return callback(error, null);
    });
};

/**
 * Get player challenge score.
 * @param user
 * @param levelId
 * @param callback
 */
exports.getPlayerChallengeScore = function (user, levelId, callback) {
    database.ref('PlayerScore/' + user.uid + '/' + levelId).once('value').then(function (snapshot) {
        return callback(null, snapshot.val());
    }, function (error) {
        console.log(error);
        return callback(error, null);
    });
};


/**
 * Add Player Challenge/Level history and update player totoal score.
 * @param user
 * @param levelId
 * @param score
 * @param startTime
 * @param endTime
 * @param oldScore
 */
exports.addPlayerGameHistory = function (user, levelId, score, oldScore, startTime, endTime) {

    if (oldScore < score) {
        updatePlayerTotalScore(user, score, oldScore);
    }
    var dbPath = 'PlayerGameHistory/' + user.uid + '/' + levelId;
    var updates = {score: score, StartTime: startTime, EndTime: endTime}
    database.ref(dbPath).push(updates, function (error) {
        if (error) console.error(error);
        console.log("PlayerGameHistory has been saved succesfully");
    });

}

/**
 * Update Data
 * @param updates
 * @returns {*}
 */
exports.updateData = function (updates, callback) {
    database.ref().update(updates).then(function () {
        return callback(null, true);
    }).catch(function (error) {
        console.error(error);
        return callback(error, null);
    });
}

/**
 * update Player score for challenge.
 * @param user
 * @param levelId
 * @param record
 * @param callback
 */
exports.updatePlayerScoreForChallenge = function (user, levelId, record, callback) {
    var dbPath = 'PlayerScore/' + user.uid + '/' + levelId;
    var updates = {};
    updates[dbPath] = record;
    updates[dbPath] = record;
    database.ref().update(updates).then(function () {
        return callback(null, true);
    }).catch(function (error) {
        console.error(error);
        return callback(error, null);
    });
}

/**
 * Get User current leader board postion.
 * @param user
 * @param callback
 */
exports.getUserLeaderboardPosition = function (user, callback) {
    database.ref('PlayerData').child(user.uid).once('value').then(function (snapshot) {
        var record = snapshot.val();
        if (record) {
            var playerDivision = record.ProgressStats.CurrentLeaderboard;
            var totalScore = record.ProgressStats.TotalScore;
            database.ref('Leaderboard/' + playerDivision).orderByChild('TotalScore').startAt(totalScore).once("value", function (snap) {
                return callback(null, {"Position": snap.numChildren()});
            });
        } else {
            return callback(null, null);
        }

    }, function (error) {
        console.log(error);
        return callback(error, null);
    });
};


/**
 * update Player score for challenge.
 * @param user
 * @param levelId
 * @param record
 * @param callback
 */
exports.updatePlayerData = function (user, playerData, callback) {
    var updates = {};
    updates['PlayerData/' + user.uid] = playerData;
    database.ref().update(updates).then(function () {
        return callback(null, true);
    }).catch(function (error) {
        console.error(error);
        return callback(error, null);
    });
}

exports.getInAppPurchaseItemsByPlatform = function (user, platform, callback) {

    database.ref('InAppPurchases').orderByChild('Platform').equalTo(platform).once('value', function (snapshot) {
        var records = snapshot.val();
        return callback(null, records);

    }, function (error) {
        console.log(error);
        return callback(error, null);
    });
};


exports.getInAppPurchaseById = function (inAppPurchasesId, callback) {
    database.ref('InAppPurchases').child(inAppPurchasesId).once('value', function (snapshot) {
        var records = snapshot.val();
        return callback(null, records);

    }, function (error) {
        console.log(error);
        return callback(error, null);
    });
};


exports.getUserPowerUpsByItemType = function (user, itemType, callback) {

    database.ref('PlayerData/' + user.uid + '/PowerUps').once('value', function (snapshot) {
        var records = snapshot.val();
        var powerUps = [];
        if (records) {
            records.forEach(function (powerUp) {
                if (itemType == powerUp.PowerUpItem.ItemType) {
                    powerUps.push(powerUp);
                }
            });
        }
        callback(null, powerUps);
    }, function (error) {
        console.log(error);
        callback(error, null);
    });
}

exports.getUserPlayerData = function (user, callback) {
    database.ref('PlayerData/' + user.uid).once('value', function (snapshot) {
        callback(null, snapshot.val());
    }, function (error) {
        console.log(error);
        callback(error, null);
    });
};

exports.getUserProfileData = function (user, callback) {
    database.ref('UserProfile/' + user.uid).once('value', function (snapshot) {
        let userData = snapshot.val();
        let currentTime = moment().utc();
        let ConsecutiveData = {
            ConsecutiveLastUpdated: currentTime.unix(),
            ConsecutiveStartDate: currentTime.unix(),
            Consecutive_Play: 0
        };
        if (userData.ConsecutiveData && moment.unix(userData.ConsecutiveData.ConsecutiveStartDate
                && moment.unix(userData.ConsecutiveData.ConsecutiveLastUpdated))) {
            let ConsecutiveLastUpdated = moment.unix(userData.ConsecutiveData.ConsecutiveLastUpdated).utc();
            let ConsecutiveStartDate = moment.unix(userData.ConsecutiveData.ConsecutiveStartDate).utc();
            let Consecutive_Play = userData.ConsecutiveData.Consecutive_Play ? userData.ConsecutiveData.Consecutive_Play : 0;
            if (currentTime.diff(ConsecutiveLastUpdated, 'days') != 0) {
                if (currentTime.diff(ConsecutiveStartDate, 'days') == (Consecutive_Play + 1)
                    && (Consecutive_Play + 1) <= 5) {
                    userData.ConsecutiveData.Consecutive_Play = Consecutive_Play + 1;
                    userData.ConsecutiveData.ConsecutiveLastUpdated = currentTime.unix();
                    userData.ConsecutiveData.ConsecutiveStartDate = ConsecutiveStartDate.unix();
                } else {
                    userData.ConsecutiveData = ConsecutiveData;
                }
            }
        } else {
            userData.ConsecutiveData = ConsecutiveData;
        }
        if (userData.MaybankLoggedIn == null || userData.MaybankLoggedIn == "" || !userData.MaybankLoggedIn) {
            userData.MaybankLoggedIn = false;
        } else {
            userData.MaybankLoggedIn = true;
        }
        snapshot.ref.set(userData);
        callback(null, userData);
    }, function (error) {
        console.log(error);
        callback(error, null);
    });
};

exports.updateUserProfileData = function (user, userProfile, callback) {
    var updates = {};
    updates['UserProfile/' + user.uid] = userProfile;
    database.ref().update(updates).then(function () {
        callback(null, {'status': 'Success'});
    }).catch(function (error) {
        console.error(error);
        callback(error, null);
    });
};

exports.addDefaultUserData = function (user) {
    var userProfile = {
        "UserName": "", "Email": user.email, "Maybank_token": "", "Player_Country": "", "Player_Tier": "",
        "Player_Balance": "0.0", "Telephone": "", "FirstName": "", "LastName": "", "FB_token": ""
    };
    var playerData = {
        "Coins": 0,
        "PowerUps": [],
        "ProgressStats": {"CurrentLeaderboard": "bronze", "TotalScore": 0, "TriviaScore": 0}
    };
    var leaderBoardData = {"LastPlayedTime": 0, "PlayerLocation": "", "PlayerName": "", "TotalScore": 0, "UserRank": 0};

    var updates = {};
    updates['PlayerData/' + user.uid] = playerData;
    database.ref().update(updates);

    var leaderBoardUpdate = {}
    leaderBoardUpdate['Leaderboard/bronze/' + user.uid] = leaderBoardData;
    database.ref().update(leaderBoardUpdate);

    var userProfileUpdates = {};
    userProfileUpdates['UserProfile/' + user.uid] = userProfile;
    database.ref().update(userProfileUpdates);


};


exports.gameDataImport = function (data, callback) {
    const countryDialCode = data['CountryDialCode'] ? data['CountryDialCode'] : [];
    const divisionType = data['DivisionType'] ? data['DivisionType'] : [];
    const gameSettings = data['GameSettings'] ? data['GameSettings'] : [];
    const challenges = data['Challenge'] ? data['Challenge'] : [];
    const challengeTitle = data['ChallengeTitle'] ? data['ChallengeTitle'] : [];
    const challengeData = data['ChallengeData'] ? data['ChallengeData'] : [];
    const gameType = data['GameTypes'] ? data['GameTypes'] : [];
    const playType = data['PlayType'] ? data['PlayType'] : [];
    const enviromentalName = data['EnviromentalName'] ? data['EnviromentalName'] : [];
    const powerUp = data['PowerUp'] ? data['PowerUp'] : [];
    const powerUpType = data['PowerUpType'] ? data['PowerUpType'] : [];
    const powerUpEffect = data['PowerUpEffect'] ? data['PowerUpEffect'] : [];
    const effectType = data['EffectType'] ? data['EffectType'] : [];
    const inAppPurchases = data['InAppPurchases'] ? data['InAppPurchases'] : [];
    const inAppItem = data['InAppItem'] ? data['InAppItem'] : [];
    const platform = data['Platform'] ? data['Platform'] : [];
    const triviaQuestions = data['TriviaQuestions'] ? data['TriviaQuestions'] : [];
    const triviaAnswers = data['TriviaAnswers'] ? data['TriviaAnswers'] : [];
    const reward = data['Reward'] ? data['Reward'] : [];
    const rewardRelease = data['RewardRelease'] ? data['RewardRelease'] : [];
    const rewardType = data['RewardType'] ? data['RewardType'] : [];
    const shopItems = data['ShopItems'] ? data['ShopItems'] : [];
    const powerUpItem = data['PowerUpItem'] ? data['PowerUpItem'] : [];
    const itemMapping = data['ItemMapping'] ? data['ItemMapping'] : [];

    enviromentalNameMap = {};
    enviromentalName.forEach(function (item) {
        if (item.ID) {
            Object.keys(item).forEach(function (k) {
                if (!k) delete item[k];
            });
            enviromentalNameMap[item.ID] = item;
            delete item.ID;
        }
    });

    if (!utils.isEmpty(enviromentalNameMap)) {
        database.ref().child('EnviromentalName').set(enviromentalNameMap);
    } else {
        console.log('EnviromentalName Empty');
    }

    playTypeMap = {};
    playType.forEach(function (item) {
        if (item.ID) {
            Object.keys(item).forEach(function (k) {
                if (!k) delete item[k];
            });
            playTypeMap[item.ID] = item;
            delete item.ID;
        }
    });

    if (!utils.isEmpty(playTypeMap)) {
        database.ref().child('PlayType').set(playTypeMap);
    } else {
        console.log('PlayType Empty');
    }

    let gameTypeMap = {};
    gameType.forEach(function (item) {
        if (item.ID) {
            Object.keys(item).forEach(function (k) {
                if (!k) delete item[k];
            });
            item.PlayType = playTypeMap[item.PlayType.trim()].Type;
            gameTypeMap[item.ID] = item;
            delete item.ID;
        }
    });

    if (!utils.isEmpty(gameTypeMap)) {
        database.ref().child('GameTypes').set(gameTypeMap);
    } else {
        console.log('GameTypes Empty');
    }

    gameSettingsMap = {};
    gameSettings.forEach(function (item) {
        if (item.ID) {
            var GameTypes = [];
            Object.keys(item).forEach(function (k) {
                if (!k) delete item[k];
            });
            item.GameTypes = item.GameTypes.trim().split(',');
            item.GameTypes.forEach(function (key) {

                if (key && typeof key == "string") {
                    var type = gameTypeMap[key.trim()];
                    type.id = key.trim();
                    GameTypes.push(type);
                } else {
                    GameTypes.push(key);
                }

            });
            item.GameTypes = GameTypes;
            gameSettingsMap[item.ID] = item;
            delete item.ID;
        }
    });

    if (!utils.isEmpty(gameSettingsMap)) {
        database.ref().child('GameSettings').set(gameSettingsMap);
    } else {
        console.log('GameSettings Empty');
    }

    challengeTitleMap = {};
    challengeTitle.forEach(function (item) {
        if (item.ID) {
            Object.keys(item).forEach(function (k) {
                if (!k) delete item[k];
            });
            challengeTitleMap[item.ID] = item;
            delete item.ID;
        }
    });

    if (!utils.isEmpty(challengeTitleMap)) {
        database.ref().child('ChallengeTitle').set(challengeTitleMap);
    } else {
        console.log('ChallengeTitle Empty');
    }

    challengeDataMap = {};
    challengeData.forEach(function (item) {
        if (item.ID) {
            Object.keys(item).forEach(function (k) {
                if (!k) delete item[k];
            });
            var EnvironmentName = enviromentalNameMap[item.EnvironmentName.trim()];
            var ChallengeTitle = challengeTitleMap[item.ChallengeTitle.trim()];
            var GameSettings = gameSettingsMap[item.GameSettings.trim()];
            if (EnvironmentName) {
                EnvironmentName.id = item.EnvironmentName.trim();
                item.EnvironmentName = EnvironmentName;
            }

            if (ChallengeTitle) {
                ChallengeTitle.id = item.ChallengeTitle.trim();
                item.ChallengeTitle = ChallengeTitle;
            }

            if (GameSettings) {
                GameSettings.id = item.GameSettings.trim();
                item.GameSettings = GameSettings;
            }

            challengeDataMap[item.ID] = item;
            delete item.ID;
        }
    });

    if (!utils.isEmpty(challengeDataMap)) {
        database.ref().child('ChallengeData').set(challengeDataMap);
    } else {
        console.log('ChallengeData Empty');
    }

    challengesMap = {};
    challenges.forEach(function (item) {

        if (item.ChallengeData) {
            var id = item.ChallengeData.trim();
            Object.keys(item).forEach(function (k) {
                if (!k) delete item[k];
            });
            item.ChallengeData = challengeDataMap[id];
            item.StartDate = Number(item.StartDate);
            item.EndDate = Number(item.EndDate);
            challengesMap[id] = item;
            delete item.ID;
        }
    });

    if (!utils.isEmpty(challengesMap)) {
        database.ref().child('Challenge').set(challengesMap);
    } else {
        console.log('Challenge Empty');
    }

    let countryDialMap = {};
    countryDialCode.forEach(function (code) {
        if (code.ID) {
            Object.keys(code).forEach(function (k) {
                if (!k) delete code[k];
            });
            countryDialMap[code.ID] = code;
            delete code.ID;
        }
    });

    challengesMap = {};
    challenges.forEach(function (item) {
        if (item.ID) {
            Object.keys(item).forEach(function (k) {
                if (!k) delete item[k];
            });
            item.ChallengeData = challengeDataMap[item.ChallengeData.trim()];
            item.StartDate = Number(item.StartDate);
            item.EndDate = Number(item.EndDate);
            challengesMap[item.ID] = item;
            delete item.ID;
        }
    });

    if (!utils.isEmpty(countryDialMap)) {
        database.ref().child('CountryDialCode').set(countryDialMap);
    } else {
        console.log('CountryDialCode Empty');
    }

    platformMap = {};
    platform.forEach(function (item) {
        if (item.ID) {
            Object.keys(item).forEach(function (k) {
                if (!k) delete item[k];
            });
            platformMap[item.ID] = item;
            delete item.ID;
        }
    });

    if (!utils.isEmpty(platformMap)) {
        database.ref().child('Platform').set(platformMap);
    } else {
        console.log('Platform Empty');
    }


    divisionTypeMap = {};
    divisionType.forEach(function (type) {
        if (type.ID) {
            Object.keys(type).forEach(function (k) {
                if (!k) delete type[k];
            });
            divisionTypeMap[type.ID] = {name: type.Name};
            delete type.ID;
        }
    });

    if (!utils.isEmpty(divisionTypeMap)) {
        database.ref().child('DivisionType').set(divisionTypeMap);
    } else {
        console.log('DivisionType Empty');
    }

    effectTypeMap = {};
    effectType.forEach(function (type) {
        if (type.ID) {
            Object.keys(type).forEach(function (k) {
                if (!k) delete type[k];
            });
            effectTypeMap[type.ID] = {Effect: type.Effect};
            delete type.ID;
        }
    });

    if (!utils.isEmpty(effectTypeMap)) {
        database.ref().child('EffectType').set(effectTypeMap);
    } else {
        console.log('EffectType Empty');
    }


    powerUpEffectMap = {};
    powerUpEffect.forEach(function (item) {
        if (item.ID) {
            Object.keys(item).forEach(function (k) {
                if (!k) delete item[k];
            });
            var effectType = effectTypeMap[item.EffectType];
            if (effectType) {
                powerUpEffectMap[item.ID] = item;
                item.EffectType = effectType.Effect;
                delete item.ID;
            }

        }
    });

    if (!utils.isEmpty(powerUpEffectMap)) {
        database.ref().child('PowerUpEffect').set(powerUpEffectMap);
    } else {
        console.log('PowerUpEffect Empty');
    }


    powerUpTypeMap = {};
    powerUpType.forEach(function (item) {
        if (item.ID) {
            Object.keys(item).forEach(function (k) {
                if (!k) delete item[k];
            });
            powerUpTypeMap[item.ID] = item;
            delete item.ID;
        }
    });

    if (!utils.isEmpty(powerUpTypeMap)) {
        database.ref().child('PowerUpType').set(powerUpTypeMap);
    } else {
        console.log('PowerUpType Empty');
    }

    powerUpItemMap = {};
    powerUpItem.forEach(function (item) {
        if (item.ID) {
            Object.keys(item).forEach(function (k) {
                if (!k) delete item[k];
            });
            var powerUpType = powerUpTypeMap[item.PowerUpType.toLowerCase()];
            if (powerUpType) {
                powerUpItemMap[item.ID] = {
                    ItemType: powerUpType.Type,
                    ItemName: item.Name,
                    itemDescription: item.Description,
                    Image: item.Image
                }
                delete item.ID;
            }
        }
    });

    if (!utils.isEmpty(powerUpItemMap)) {
        database.ref().child('PowerUpItem').set(powerUpItemMap);
    } else {
        console.log('PowerUpItem Empty');
    }

    powerUpMap = {};
    powerUp.forEach(function (item) {
        if (item.PowerUpItem) {
            Object.keys(item).forEach(function (k) {
                if (!k) delete item[k];
            });
            var powerUpItem = powerUpItemMap[item.PowerUpItem];
            var powerUpEffects = item.PowerUpEffects;
            if (powerUpItem) {
                powerUpItem.id = item.PowerUpItem;
                item.PowerUpItem = powerUpItem;
                item.PowerUpEffects = [];
                if (powerUpEffects.trim()) {
                    powerUpEffects = powerUpEffects.trim().split(',');
                    powerUpEffects.forEach(function (key) {
                        var effect = powerUpEffectMap[key.trim()];
                        if (effect) {
                            effect.id = key;
                            item.PowerUpEffects.push(effect);
                        }
                    });
                }

                powerUpMap[powerUpItem.id] = item;
            }
        }
    });

    if (!utils.isEmpty(powerUpMap)) {
        database.ref().child('PowerUp').set(powerUpMap);
    } else {
        console.log('PowerUp Empty');
    }

    inAppItemMap = {};
    inAppItem.forEach(function (item) {
        if (item.ID) {
            Object.keys(item).forEach(function (k) {
                if (!k) delete item[k];
            });
            inAppItemMap[item.ID] = item;
            item.PowerUps = item.PowerUps.trim().split(',');
            delete item.ID;
        }
    });

    if (!utils.isEmpty(inAppItemMap)) {
        database.ref().child('InAppItem').set(inAppItemMap);
    } else {
        console.log('InAppItem Empty');
    }

    inAppPurchasesMap = {};
    inAppPurchases.forEach(function (item) {
        if (item.ID) {
            Object.keys(item).forEach(function (k) {
                if (!k) delete item[k];
            });
            var platform = platformMap[item.Platform];
            if (platform) {
                var powerUps = [];
                item.Platform = platform.Name;
                inAppPurchasesMap[item.ID] = item;
                var inAppItemId = item.InAppItem.trim();
                item.InAppItem = inAppItemMap[inAppItemId];
                item.InAppItem.id = inAppItemId;
                item.InAppItem.PowerUps.forEach(function (key) {
                    if (key && typeof key == "string") {
                        var power = powerUpMap[key.trim()];
                        power.id = key.trim();
                        powerUps.push(power);
                    } else {
                        powerUps.push(key);
                    }
                });

                item.InAppItem.PowerUps = powerUps;
                delete item.ID;
            }

        }
    });

    if (!utils.isEmpty(inAppPurchasesMap)) {
        database.ref().child('InAppPurchases').set(inAppPurchasesMap);
    } else {
        console.log('InAppPurchases Empty');
    }

    shopItemsMap = {};
    shopItems.forEach(function (item) {
        if (item.ID) {
            var powerUps = [];
            Object.keys(item).forEach(function (k) {
                if (!k) delete item[k];
            });
            shopItemsMap[item.InAppPurchase] = item;
            item.InAppPurchase = inAppPurchasesMap[item.InAppPurchase];
            /*
             item.InAppItem = inAppItemMap[item.InAppPurchase.InAppItem];
             item.InAppItem.id = item.InAppPurchase.InAppItem;
             item.InAppItem.PowerUps.forEach(function(key) {
             if(key &&  typeof key == "string") {
             var power = powerUpMap[key.trim()];
             power.id = key.trim();
             powerUps.push(power);
             } else {
             powerUps.push(key);
             }

             });

             item.InAppItem.PowerUps = powerUps;
             */
            item.InAppItem = item.InAppPurchase.InAppItem;
            delete item.ID;
            delete item.InAppPurchase;
        }
    });

    if (!utils.isEmpty(shopItemsMap)) {
        database.ref().child('ShopItem').set(shopItemsMap);
    } else {
        console.log('ShopItem Empty');
    }

    triviaAnswersMap = {};
    triviaAnswers.forEach(function (item) {
        if (item.ID) {
            Object.keys(item).forEach(function (k) {
                if (!k) delete item[k];
            });
            triviaAnswersMap[item.ID] = item;
            delete item.ID;
        }
    });

    if (!utils.isEmpty(triviaAnswersMap)) {
        database.ref().child('TriviaAnswers').set(triviaAnswersMap);
    } else {
        console.log('TriviaAnswers Empty');
    }

    triviaQuestionsMap = {};
    triviaQuestions.forEach(function (item) {
        var TrivaAnswers = [];
        if (item.ID) {
            Object.keys(item).forEach(function (k) {
                if (!k) delete item[k];
            });
            item.TrivaAnswers = item.TrivaAnswers.trim().split(',');
            item.TrivaAnswers.forEach(function (key) {
                if (key && typeof key == "string") {
                    var answer = triviaAnswersMap[key.trim()];
                    answer.id = key.trim();
                    TrivaAnswers.push(answer);
                } else {
                    TrivaAnswers.push(answer);
                }
            });
            item.TrivaAnswers = TrivaAnswers;
            triviaQuestionsMap[item.ID] = item;
            delete item.ID;
        }
    });

    if (!utils.isEmpty(triviaQuestionsMap)) {
        database.ref().child('TriviaQuestions').set(triviaQuestionsMap);
    } else {
        console.log('TriviaQuestions Empty');
    }

    rewardReleaseMap = {};
    rewardRelease.forEach(function (item) {
        if (item.ID) {
            Object.keys(item).forEach(function (k) {
                if (!k) delete item[k];
            });
            rewardReleaseMap[item.ID] = item;
            delete item.ID;
        }
    });

    if (!utils.isEmpty(rewardReleaseMap)) {
        database.ref().child('RewardRelease').set(rewardReleaseMap);
    } else {
        console.log('RewardRelease Empty');
    }

    rewardTypeMap = {};
    rewardType.forEach(function (item) {
        if (item.ID) {
            Object.keys(item).forEach(function (k) {
                if (!k) delete item[k];
            });
            rewardTypeMap[item.ID] = item;
            delete item.ID;
        }
    });

    if (!utils.isEmpty(rewardTypeMap)) {
        database.ref().child('RewardType').set(rewardTypeMap);
    } else {
        console.log('RewardType Empty');
    }

    rewardMap = {};
    reward.forEach(function (item) {
        if (item.ID) {
            Object.keys(item).forEach(function (k) {
                if (!k) delete item[k];
            });
            item.Type = rewardTypeMap[item.Type.trim()];
            item.RewardRelease = rewardReleaseMap[item.RewardRelease.trim()];
            rewardMap[item.ID] = item;
            delete item.ID;
        }
    });

    if (!utils.isEmpty(rewardMap)) {
        database.ref().child('Reward').set(rewardMap);
    } else {
        console.log('Reward Empty');
    }

    itemMappingMap = {};
    itemMapping.forEach(function (item) {
        if (item.ID) {
            Object.keys(item).forEach(function (k) {
                if (!k) delete item[k];
            });
            itemMappingMap[item.ID] = item;
            delete item.ID;
        }
    });

    if (!utils.isEmpty(itemMappingMap)) {
        database.ref().child('ItemMapping').set(itemMappingMap);
    } else {
        console.log('ItemMapping Empty');
    }


    callback(null, {'status': 'Success'});


};


/**
 * Update Player total score and also on player leader board.
 * @param user
 * @param score
 * @param oldScore
 */
function updatePlayerTotalScore(user, score, oldScore) {

    dbRef = database.ref('PlayerData/' + user.uid);
    dbRef.once('value', function (snapshot) {
        var record = snapshot.val();
        if (record) {
            var playerDivision = record.ProgressStats.CurrentLeaderboard;
            console.log(playerDivision);

            record.ProgressStats.TotalScore += parseInt(score, 10) - oldScore;
            dbRef.set(record);
            var childRef = database.ref('Leaderboard/' + playerDivision).child(user.uid);
            childRef.once("value", function (snap) {
                var data = snap.val();
                if (!data) {
                    data = {};
                    data.PlayerLocation = "";
                    data.PlayerName = user.name;
                    data.UserRank = 0;
                }
                data.LastPlayedTime = new Date().getTime();
                data.TotalScore = record.ProgressStats.TotalScore;
                childRef.update(data);
                console.log("Leaderboard has been saved succesfully");
            });
            console.log("Player TotalScore has been saved succesfully");
        }
    }, function (error) {
        console.log(error);
    });

}




