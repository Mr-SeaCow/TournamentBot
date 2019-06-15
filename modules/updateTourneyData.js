const tourneyData = require('../data/tourneyData.json');
const fs = require('fs');
let {players, currentRoundLeaderboard, sortedAfterRoundLeaderboard} = tourneyData;

module.exports = (data) => {
    let {blue, orange, victor, overtime} = data;
    console.log(data)
    for (let x in blue) {
        let curPlayer = blue[x]
        let points = (victor == 'blue' ? 2 : (overtime == true ? 1 : 0))
        if (!playerDoesExistInCurrentLeaderboard(curPlayer)) {
            addPlayerToCurrentLeaderboard(curPlayer, points);
        }
    }
    for (let x in orange) {
        let curPlayer = orange[x]
        let points = (victor == 'orange' ? 2 : (overtime == true ? 1 : 0))
        if (!playerDoesExistInCurrentLeaderboard(curPlayer)) {
            addPlayerToCurrentLeaderboard(curPlayer, points);
        }
    }
    updateTourneyData()
    if (hasEveryonePlayed()) {
        updateAfterRoundLeaderboard()
    }
    updateTourneyData()
}

function playerDoesExistInCurrentLeaderboard(player) {
    return (currentRoundLeaderboard[player.name])
}

function addPlayerToCurrentLeaderboard(player, points){
    let {name, score} = player
    score = Number(score);
    currentRoundLeaderboard[name] = {
        name,
        score,
        points
    }
}

function hasEveryonePlayed(){
    return (Object.keys(currentRoundLeaderboard).length >= players.length)
}

function updateAfterRoundLeaderboard() {
    let tempArr = []
    for (let x in currentRoundLeaderboard) {
        tempArr.push(currentRoundLeaderboard[x])
    }
    tempArr.sort((a, b) => {
        return b.score - a.score;
    })

    sortedAfterRoundLeaderboard = tempArr;
    updateTourneyData()
}

function updateTourneyData() {
    tourneyData.sortedAfterRoundLeaderboard = sortedAfterRoundLeaderboard;
    tourneyData.players = players;
    tourneyData.currentRoundLeaderboard = currentRoundLeaderboard;
    fs.writeFileSync('./data/tourneyData.json', JSON.stringify(tourneyData, null, 1));
}