const tourneyData = require('../data/tourneyData.json');
const similarity = require('./similarity');
const fs = require('fs');
module.exports = (Client, message, args) => {
    if (tourneyData.registrationIsClosed == true) return message.channel.send('Sorry, registration has already closed.')
    if (!args[0]) return message.channel.send('Please provide the name of your account!');
    let name = args.join('').toLowerCase().trim().replace(/ |"|\\/g, '');
    let highestSimilarity = 0;
    let highestMatch = '';
    for (let x in tourneyData.players) {
        let s = similarity(name, tourneyData.players[x]);
        if (s > highestSimilarity) {
            highestSimilarity = s;
            highestMatch = tourneyData.players[x];
        }
    }
    if (highestSimilarity > .7) return message.channel.send(`Seems like you\'re already in the system as ${highestMatch}`)
    tourneyData.players.push(name)
    fs.writeFile('./data/tourneyData.json', JSON.stringify(tourneyData, null, 1), (err) => {
        if (err) return console.err;
        message.channel.send(`You were successfully registered under the name "**${name}**".`)
    })
}