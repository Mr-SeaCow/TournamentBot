const Discord = require('discord.js');
const Client = new Discord.Client();
const tesseract = require('./modules/tesseract');
const removeImages = require('./modules/removeImages');
const prefix = '!';
const TOURNEY_MASTER = require('./modules/tourneyMaster');

Client.tourneyMaster = new TOURNEY_MASTER();

require('dotenv').config();

Client.on('ready', () => {
  Client.generateInvite(['ADMINISTRATOR'])
    .then(link => console.log(link))
    .catch(console.error);

  Client.tourneyMaster.on('NEW_MATCHES', (matchEmbed, channelID) => {
    Client.channels.get(channelID).send({ embed: matchEmbed });
  })
})

Client.on('message', (message) => {
  if (message.channel.type === 'dm') return;
  if (message.author.id !== '176532282935345153') return;
  if (message.author.bot == true) return;
  let content = message.content.split(' ');
  let cmd = content.shift();
  const args = content;
  if (!cmd.startsWith(prefix)) return;
  cmd = cmd.slice(1);

  switch (cmd) {
    case 'submit': {
      if (!authenticatedUser(message.member)) return;
      tesseract(Client, message, args, Client.tourneyMaster, (teams, channel, nextMatchID) => verificationCollector(teams, channel, nextMatchID, message.author.id));
      break;
    }
    case 'register': {
      Client.tourneyMaster.register(message, args);
      break;
    }
    case 'leaderboard': {
      let leaderboard = Client.tourneyMaster.leaderboard;

      let pointerArr = ["name", "points", "score"];
      let longestStringArr = []
      let totalLength = 4;
      let resultString = ''
      for (let i in pointerArr) {
        longestStringArr.push(lengthFinder(leaderboard, pointerArr[i]))
        totalLength += longestStringArr[i];
      }
      for (let row in leaderboard) {
        if (row == 0) {
          resultString += '\n#' + '#'.repeat(totalLength - 2) + '#'
          resultString += '\n#' + addPadding(totalLength - 2, 'LEADERBOARD') + '#'
          resultString += '\n#' + '='.repeat(totalLength - 2) + '#'
          resultString += '\n#' + addPadding(longestStringArr[0],'NAME') + "|" + addPadding(longestStringArr[1], 'POINTS') + "|" + addPadding(longestStringArr[2], 'SCORE') + "#" 
          resultString += '\n#' + addPadding(longestStringArr[0],'').replace(/ /g, '-') + "+" + addPadding(longestStringArr[1], '').replace(/ /g, '-') + "+" + addPadding(longestStringArr[2], '').replace(/ /g, '-') + "#" 
        }

        resultString += '\n#' + addPaddingRight(longestStringArr[0], leaderboard[row]['name']) + "|" + addPadding(longestStringArr[1], leaderboard[row]['points']) + "|" + addPadding(longestStringArr[2], leaderboard[row]['score']) + "#"
      }
      resultString += '\n#' + '#'.repeat(totalLength - 2) + '#'
      message.channel.send(resultString, { code: 'MD' });
      break;
    }
    case 'status': {
      message.channel.send(Client.tourneyMaster.status, { code: 'md' })
      break;
    }
    case 'startTourney': {
      if (!authenticatedUser(message.member)) return;
      Client.tourneyMaster.startTournament(message);
      break;
    }
    case 'newTourney': {
      if (!authenticatedUser(message.member)) return;
      Client.tourneyMaster.newTourney(message, args);
      break;
    }
    case 'setChannel': {
      if (!authenticatedUser(message.member)) return;
      Client.tourneyMaster.setChannel(message.channel.id);
      break;
    }
  }
})

function lengthFinder(arr, pointer) {
  let longestStringLength = pointer.length;

  for (let i in arr) {
    let curItem = String(arr[i][pointer]);

    if (curItem.length > longestStringLength) {
      longestStringLength = curItem.length;
    }
  }
  if (pointer.length % 2 == 0 ) {
    longestStringLength = (longestStringLength % 2 == 0 ? longestStringLength : longestStringLength + 1);
  } else {
    longestStringLength = (longestStringLength % 2 == 1 ? longestStringLength : longestStringLength++);
  }
  return longestStringLength + 2;
}

function addPadding(totalLength, x) {

  x = String(x);

  let paddingLength = totalLength - x.length;
  let padLeft, padRight;
  let filler = ''
  if ((paddingLength) % 2 == 0) {
    padLeft = paddingLength / 2;
    padRight = padLeft;
  } else {
    if (!isNaN(x) && x !== '') {
      padLeft = Math.floor(paddingLength / 2);
      padRight = Math.floor(paddingLength / 2);
      filler = '0'
    } else {
      padLeft = Math.floor(paddingLength / 2);
      padRight = Math.ceil(paddingLength / 2);
    }
  }
  return ' '.repeat(padLeft) + filler + x + ' '.repeat(padRight);
}

function addPaddingRight(totalLength, x) {
    x = ' '.repeat(1) + x + ' '.repeat(totalLength - x.length - 1);
    return x;
}



function verificationCollector(teams, channel, nextMatchID, message) {
  let { iName, iScore, victor, blue, orange, overtime } = teams;
  const filter = (m) => { return (m.content.includes(`!verify ${nextMatchID}`) && m.content.split(' ').length > iName.length + iScore.length + 1 && message.author.id == m.authorl.id) };
  const collector = new Discord.MessageCollector(channel, filter, { maxMatches: 1 });
  collector.on('collect', m => {
    let args = m.content.split(' ').slice(1, m.length);
    args.shift();
    for (let x in iName) {
      let num = iName[x].number;
      if (num > 2) num = num - 3;
      teams[iName[x].team][num].name = args.shift();
    }
    iName = [];
    for (let x in iScore) {
      let num = iScore[x].number;
      if (num > 2) num = num - 3;
      teams[iScore[x].team][num].score = args.shift();
    }
    iScore = [];
    removeImages();
    channel.send('Match has been verified!');
    Client.tourneyMaster.addMatch(blue, orange, victor, overtime);
  });
}

function authenticatedUser(member) {
  if (member.hasPermission(['ADMINISTRATOR'])) return true;
  return false;
}

Client.login(process.env.BOT_TOKEN);
