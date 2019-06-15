const Discord = require('discord.js');
const Client = new Discord.Client();
const tesseract = require('./modules/tesseract');
const register = require('./modules/register');
const removeImages = require('./modules/removeImages');
const prefix = '!';
const TOURNEY_MASTER = require('./modules/tourneyMaster');
const tourneyMaster = new TOURNEY_MASTER();

require('dotenv').config();

Client.on('ready', () => {
  Client.generateInvite(['ADMINISTRATOR'])
    .then(link => console.log(link))
    .catch(console.error);

    tourneyMaster.on('NEW_MATCHES', (matchEmbed, channelID) => {
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
      tesseract(Client, message, args, tourneyMaster, (teams, channel, nextMatchID) => verificationCollector(teams, channel, nextMatchID));
      break;
    }
    case 'register': {
      register(Client, message, args);
      break;
    }
    case 'leaderboard': {
      message.channel.send(JSON.stringify(tourneyMaster.leaderboard).replace('[', '').replace(']', '').replace(/},/g,'}\n'),{code: 'JSON'});
      break;
    }
    case 'start': {
      tourneyMaster(Client, message, args);
    }
  }
})

function verificationCollector(teams, channel, nextMatchID) {
  let { iName, iScore, victor, blue, orange, overtime } = teams;
  const filter = (m) => { return (m.content.includes(`!verify ${nextMatchID}`) && m.content.split(' ').length > iName.length + iScore.length + 1) };
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
    tourneyMaster.addMatch(blue, orange, victor, overtime);
  });
}

Client.login(process.env.BOT_TOKEN);
