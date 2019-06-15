const tourneyData = require('../data/tourneyData.json');
const fs = require('fs')
module.exports = (Client, message, args) => {
    if (tourneyData.tourneyHasStarted == true) return message.channel.send('Looks like the tournement has already started!');
    tourneyData.tourneyHasStarted = true;
    tourneyData.registrationIsClosed = true;
    updateTourneyData();
}

function updateTourneyData() {
    fs.writeFileSync('./data/tourneyData.json', JSON.stringify(tourneyData, null, 1));
}