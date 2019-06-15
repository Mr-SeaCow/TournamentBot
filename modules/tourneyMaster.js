/* eslint-disable no-console */
const events = require('events');
const tourneyData = require('../data/tourneyData.json');
const Discord = require('discord.js');
const fs = require('fs');

class tourneyMaster extends events {

    constructor() {
        super();
        this._TourneyData = tourneyData;
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

    generateMatchEmbed(matches) {
        let embed = new Discord.RichEmbed()
            .setColor('#cc3333')
            .setTitle('**Round #2**')
            .setAuthor('R3DIRECT TOURNAMENT BOT', 'https://cdn.discordapp.com/attachments/429036941254721547/589170766189297725/tourneyBot.png')//, 'https://i.imgur.com/wSTFkRM.png', 'https://discord.js.org') 
            .setTimestamp()
            .setThumbnail('https://i.stack.imgur.com/Pwbuz.png');

        for (let i = 0; i < matches.length; i++) {
            let A = matches[i].teamA;
            let B = matches[i].teamB;
            this.generateSubs(A, B);
            embed.addField('__         **Team A**         __', `- **${A[0]}**\n- **${A[1]}**\n- **${A[2]}**`, true)
                .addField('__         **Team B**         __', `- **${B[0]}**\n- **${B[1]}**\n- **${B[2]}**`, true);
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

    playerDoesExistInCurrentLeaderboard(player) {
        return (this._TourneyData.currentRoundLeaderboard[player.name]);
    }

    playerIsOnOverallLeaderobard(player) {
        return (this._TourneyData.overallLeaderboard[player.name]);
    }

    startTournament() {
        if (this._TourneyData.tourneyHasStarted) return "Looks like the tournament has already started!";
        if (this.isRegistrationClosed()) this.closeRegistration();
        this._TourneyData.tourneyHasStarted = true;
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
        fs.writeFileSync('./data/tourneyData.json', JSON.stringify(this._TourneyData, null, 2));
    }
}

module.exports = tourneyMaster;