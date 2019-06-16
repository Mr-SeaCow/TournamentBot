/* eslint-disable no-console */
const events = require('events');
const tourneyData = require('../data/tourneyData.json');
const Discord = require('discord.js');
const fs = require('fs');
const similarity = require('./similarity');
const statusHeader = `#--------------------------#\n#          STATUS          #\n#--------------------------#`;
const statusArr = ['playerCount', 'matchesPlayed', 'currentRound', 'totalRounds', 'tourneyChannelId', 'tourneyHasStarted', 'registrationIsClosed',];

class tourneyMaster extends events {

    constructor() {
        super();
        this._TourneyData = tourneyData;
        this.embedSettings = {
            color: '#cc3333',
            author: [
                'R3DIRECT TOURNAMENT BOT',
                'https://cdn.discordapp.com/attachments/429036941254721547/589170766189297725/tourneyBot.png'
            ],
            thumbnail: 'https://i.stack.imgur.com/Pwbuz.png',
            team: [
                '__         **Team A**         __',
                '__         **Team B**         __'
            ]
        }
    }

    get leaderboard() {
        let tempArr = [];
        let oL = this._TourneyData.overallLeaderboard;
        for (let x in oL) {
            let o = oL[x];
            o.name = x;
            tempArr.push(o);
        }
        tempArr.sort((a, b) => {
            if (a.points == b.points) {
                if (a.score == b.score) {
                    if (a.name < b.name)
                        return -1;
                    if (a.name > b.name)
                        return 1;
                }
                return b.score - a.score;
            }
            return b.points - a.points;
        })
        return tempArr;
    }

    get status() {
        let str = statusHeader;
        for (let i in statusArr) {
            switch (statusArr[i]){
                case 'matchesPlayed': {
                    str += `\n< ${statusArr[i]}="${this._TourneyData['matchData'].length}">`
                    break;
                }
                case 'playerCount': {
                    str += `\n< ${statusArr[i]}="${this._TourneyData['players'].length}">`
                    break;
                }
                default: {
                    str += `\n< ${statusArr[i]}="${this._TourneyData[statusArr[i]]}">`
                }
            }
        }
        return str
    }

    get nextMatchID() {
        this.incNextMatchID();
        return this._TourneyData.nextMatchID;
    }

    get tourneyData() {
        return this._TourneyData;
    }

    addMatch(blue, orange, victor, overtime) {
        let team = [blue, orange];
        let matchObj = {
            teams: {
                orange,
                blue
            },
            victor,
            overtime,
            round: this._TourneyData.completedRounds + 1
        };
        this._TourneyData.matchData.push(matchObj);
        for (let i in team) {
            let teamString = (i == 0 ? 'blue' : 'orange');
            for (let x in team[i]) {
                let curPlayer = team[i][x];
                if (!this.playerDoesExistInCurrentLeaderboard(curPlayer)) {
                    let points = this.determinePlayersPoints(teamString, victor, overtime);
                    this.addPlayerToCurrentLeaderboard(curPlayer, points);
                }
            }
        }
        if (this.hasEveryonePlayed()) {
            this.updateAfterRoundLeaderboard();
        }
        this.updateJSONFile();
    }

    addPlayerToCurrentLeaderboard(player, points) {
        let { name, score } = player;
        score = Number(score);
        this._TourneyData.currentRoundLeaderboard[name] = {
            name,
            score,
            points
        };
    }

    archiveCurrentTourney() {
        fs.writeFileSync(`./data/archived/${Date.now()}.json`, JSON.stringify(tourneyData, null, 2))
    }

    canProceedToFinals() {
        return (this._TourneyData.completedRounds >= this._TourneyData.totalRounds);
    }

    clearRoundLeaderboards() {
        this._TourneyData.sortedAfterRoundLeaderboard = [];
        this._TourneyData.currentRoundLeaderboard = {};
        this.updateJSONFile();
    }

    closeRegistration() {
        this._TourneyData.isRegistrationClosed = true;
    }

    determinePlayersPoints(teamString, victor, overtime) {
        return (victor == teamString ? 2 : (overtime == true ? 1 : 0));
    }

    generateFirstMatch() {
        this._TourneyData.players = this.randomizeArray(this._TourneyData.players, 100)
        this.updateJSONFile();
        return this.generateMatchEmbed(this.generateFirstTeams())
    }

    generateFirstTeams() {
        let players = this._TourneyData.players;
        let teams = [{
            teamA: [],
            teamB: []
        }];

        for (let i in players) {
            let curSet = teams[teams.length - 1]
            if (curSet.teamB.length < 3) {
                if (curSet.teamA.length == curSet.teamB.length) {
                    curSet.teamA.push(players[i]);
                } else {
                    curSet.teamB.push(players[i]);
                }
            } else {
                teams.push({
                    teamA: [players[i]],
                    teamB: []
                })
            }
        }
        this.generateSubs(teams[teams.length - 1].teamA, teams[teams.length - 1].teamB)
        return teams
    }

    generateMatchEmbed(matches) {
        let embed = new Discord.RichEmbed()
            .setColor(this.embedSettings.color)
            .setTitle(`**Round #${this._TourneyData.completedRounds + 1}**`)
            .setAuthor(this.embedSettings.author[0], this.embedSettings.author[1])
            .setTimestamp()
            .setThumbnail(this.embedSettings.thumbnail);

        for (let i = 0; i < matches.length; i++) {
            let A = matches[i].teamA;
            let B = matches[i].teamB;
            this.generateSubs(A, B);
            embed.addField(this.embedSettings.team[0], `- **${A[0]}**\n- **${A[1]}**\n- **${A[2]}**`, true)
                .addField(this.embedSettings.team[1], `- **${B[0]}**\n- **${B[1]}**\n- **${B[2]}**`, true);
        }
        return embed;
    }

    generateNewSetOfMatches() {
        let teamA = [];
        let teamB = [];
        let sARL = this._TourneyData.sortedAfterRoundLeaderboard;
        let curNum = 0;
        let j = 0;
        for (let i in sARL) {
            if (curNum == 0) {
                teamA[j] = [];
                teamB[j] = [];
            }
            curNum++
            if (((Number(i) + 2) % 2) == 0) {
                if (teamA[j]) teamA[j].push(sARL[i].name);
            } else {
                teamB[j].push(sARL[i].name);
            }
            if (curNum == 6) {
                j++;
                curNum = 0;
            }
        }
        let matches = [];
        for (let x in teamA) {
            matches.push({ 'teamA': teamA[x], 'teamB': teamB[x] });
        }
        this.clearRoundLeaderboards();
        this.emit('NEW_MATCHES', this.generateMatchEmbed(matches), this._TourneyData.tourneyChannelId);
    }

    generateSubs(A, B) {
        while (A.length < 3) {
            A.push('*SUBSTITUTE*');
        }
        while (B.length < 3) {
            B.push('*SUBSTITUTE*');
        }
    }

    hasEveryonePlayed() {
        return (Object.keys(this._TourneyData.currentRoundLeaderboard).length >= this._TourneyData.players.length);
    }

    isRegistrationClosed() {
        return this._TourneyData.isRegistrationClosed;
    }

    incNextMatchID() {
        this._TourneyData.nextMatchID++;
        this.updateJSONFile();
    }

    newTourney(message, args){
        if (isNaN(args[0])) return message.channel.send('Please provide the expected round count.');
        this.archiveCurrentTourney();
        this._TourneyData = JSON.parse(fs.readFileSync('./data/newTourneyData.json'));
        this._TourneyData.totalRounds = Number(args[0]);
        this.updateJSONFile();
        message.channel.send(`A ${args[0]} round round-robin styled tournament has been initialized.`);
    }

    randomizeArray(arr, reps = 1) {
        let tempArr = [];
        reps--;
        for (let i in arr) {
            let rand = Math.random();
            if (rand > .5) { tempArr.push(arr[i]); }
            else { tempArr.unshift(arr[i]); }
        }
        if (reps == 0) {
            return tempArr;
        } else {
            return this.randomizeArray(tempArr, reps)
        }
    }

    register(message, args) {
        if (this.isRegistrationClosed()) return message.channel.send('Sorry, registration has already closed.')
        if (!args[0]) return message.channel.send('Please provide the name of your account!');
        let name = args.join('').toLowerCase().trim().replace(/ |"|\\/g, '');
        let highestSimilarity = 0;
        let highestMatch = '';
        for (let x in this._TourneyData.players) {
            let s = similarity(name, this._TourneyData.players[x]);
            if (s > highestSimilarity) {
                highestSimilarity = s;
                highestMatch = this._TourneyData.players[x];
            }
        }
        if (highestSimilarity > .7) return message.channel.send(`Seems like you're already in the system as ${highestMatch}`);
        this._TourneyData.players.push(name);
        this.updateJSONFile();
        message.channel.send(`You were successfully registered under the name "**${name}**".`);
    }

    playerDoesExistInCurrentLeaderboard(player) {
        return (this._TourneyData.currentRoundLeaderboard[player.name]);
    }

    playerIsOnOverallLeaderobard(player) {
        return (this._TourneyData.overallLeaderboard[player.name]);
    }

    startTournament(message) {
        if (this._TourneyData.tourneyHasStarted) return message.channel.send("Looks like the tournament has already started!");
        if (this.isRegistrationClosed()) this.closeRegistration();
        this._TourneyData.tourneyHasStarted = true;
        this.updateJSONFile();
        message.channel.send({embed: this.generateFirstMatch()})
    }
    
    setChannel(id) {
        this._TourneyData.tourneyChannelId = id;
        this.updateJSONFile();
    }

    updateAfterRoundLeaderboard() {
        let tempArr = [];
        for (let x in this._TourneyData.currentRoundLeaderboard) {
            tempArr.push(this._TourneyData.currentRoundLeaderboard[x]);
        }
        tempArr.sort((a, b) => {
            if (b.score === a.score) {
                return b.points - a.points;
            }
            return b.score - a.score;
        })
        this._TourneyData.sortedAfterRoundLeaderboard = tempArr;
        this._TourneyData.completedRounds++;
        this.updateOverallLeaderboard();
        this._TourneyData.currentRoundLeaderboard = {};
        if (this.canProceedToFinals()) {
            console.log("START THE FINALEEEEE");
        } else {
            this.generateNewSetOfMatches();
        }
        this.updateJSONFile();
    }

    updateOverallLeaderboard() {
        let cRL = this._TourneyData.currentRoundLeaderboard;
        let oL = this._TourneyData.overallLeaderboard;
        for (let x in cRL) {
            let player = cRL[x];
            if (this.playerIsOnOverallLeaderobard(player)) {
                oL[player.name].points += player.points;
                oL[player.name].score += player.score;
            } else {
                oL[player.name] = {
                    points: player.points,
                    score: player.score
                };
            }
        }
        this.updateJSONFile();
    }

    updateJSONFile() {
        this._TourneyData.currentRound = this._TourneyData.completedRounds + 1;
        fs.writeFileSync('./data/tourneyData.json', JSON.stringify(this._TourneyData, null, 2));
    }
}

module.exports = tourneyMaster;