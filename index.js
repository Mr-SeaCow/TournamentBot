const Discord = require('discord.js');
const Client = new Discord.Client();
const tesseract = require('./modules/tesseract');
const register = require('./modules/register');
const start = require('./modules/start');
const removeImages = require('./modules/removeImages');
const prefix = '!';
const tourneyMaster = require('./modules/tourneyMaster');
const tM = new tourneyMaster();

require('dotenv').config();

Client.on('ready', () => {
  Client.generateInvite(['ADMINISTRATOR'])
    .then(link => console.log(link))
    .catch(console.error)

    tM.on('NEW_MATCHES', (matchEmbed, channelID) => {
      Client.channels.get(channelID).send({embed: matchEmbed});
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
      tesseract(Client, message, args, tM, (teams, channel, nextMatchID) => verificationCollector(teams, channel, nextMatchID))
      break;
    }
    case 'register': {
      register(Client, message, args);
      break;
    }
    case 'leaderboard': {
      message.channel.send(JSON.stringify(tM.leaderboard).replace('[', '').replace(']', '').replace(/},/g,'}\n'),{code: 'JSON'})
      break;
    }
    case 'start': {
      start(Client, message, args);
    }
  }
})

function verificationCollector(teams, channel, nextMatchID) {
  let { iName, iScore, victor, blue, orange, overtime } = teams;
  console.log(nextMatchID)
  const filter = (m) => { return (m.content.includes(`!verify ${nextMatchID}`) && m.content.split(' ').length > iName.length + iScore.length + 1) };
  const collector = new Discord.MessageCollector(channel, filter, { maxMatches: 1 })
  collector.on('collect', m => {
    let args = m.content.split(' ').slice(1, m.length);
    let match = args.shift();
    let correction = args;
    for (let x in iName) {
      let num = iName[x].number;
      if (num > 2) num = num - 3
      teams[iName[x].team][num].name = args.shift();
    }
    iName = [];
    for (let x in iScore) {
      let num = iScore[x].number;
      if (num > 2) num = num - 3
      teams[iScore[x].team][num].score = args.shift();
    }
    iScore = [];
    removeImages();
    channel.send('Match has been verified!')
    tM.addMatch(blue, orange, victor, overtime)
  });
}

Client.login(process.env.BOT_TOKEN);
