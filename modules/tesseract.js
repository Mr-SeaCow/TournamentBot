const tesseract = require('node-tesseract-ocr')
const Jimp = require('jimp');
const { configNames, configNumbers, debug } = require('./constants')
const { players } = require('../data/tourneyData.json');
const similarity = require('./similarity');

module.exports = (Client, message, args, tourneyMaster, msgCollectorCallback,) => {
    let overtime = (args[0] == 'true' ? true : false);
    let victor;
    let attachment = getAttachment(message)
    if (attachment == null && debug == false) return message.channel.send('Please provide an image!')
    if (attachment !== null) attachment = attachment.url
    if (attachment == null) attachment = 'https://cdn.discordapp.com/attachments/588801775751004215/588837647582232576/image1.jpg'
    //let link = message.attachments.get(attachment[0])
    //message.channel.send(link)
    let blue = [{ score: 0, name: '' }, { score: 0, name: '' }, { score: 0, name: '' }]
    let orange = [{ score: 0, name: '' }, { score: 0, name: '' }, { score: 0, name: '' }];
    let total = 0;
    let currentImages = { name: [], score: [] }
    Jimp.read(attachment)
        .then(image => {
            let clone = image.clone();
            clone.crop(600, 200, 970, 540)
            Jimp.read(clone)
                .then(img => {
                    let spec = image.clone();
                    spec.crop(540, 835, 95, 25)
                    spec.write('./images/spectators.jpg', () => {
                        let arr = [89, 145, 202, 382, 439, 497] // No Spectators
                        let arr2 = [95, 152, 209, 390, 447, 504] // With Spectators
                        startTesseract(`./images/spectators.jpg`, 0, configNames, 'spectators', (spectators) => {

                            let curArr = (spectators == true ? arr2 : arr)
                            let colors = [];
                            for (let i = 0; i < curArr.length; i++) {
                                let a = img.clone();
                                a.crop(475, curArr[i], 68, 24)
                                a.brightness(.1)
                                a.grayscale();
                                a.write(`./images/score${i}.jpg`)
                                currentImages.score.push(a)
                                let b = img.clone();
                                b.crop(85, curArr[i] - 9, 400, 45)
                                b.contrast(-.2)
                                b.write(`./images/name${i}.jpg`)
                                currentImages.name.push(b)
                                let c = img.clone();
                                c.crop(570, curArr[i], 30, 24)
                                c.brightness(.3)
                                colors.push(Jimp.intToRGBA(c.getPixelColor(15, 12)))
                            }
                            victor = determineVictor(colors);
                            for (let i = 0; i < 6; i++) {
                                startTesseract(`./images/score${i}.jpg`, i, configNumbers, 'score', () => {})
                                startTesseract(`./images/name${i}.jpg`, i, configNames, 'name', () => {})
                            }
                        })
                    })
                })
        })

    function startTesseract(img, number, config, type, cb) {
        tesseract
            .recognize(img, config)
            .then(text => {
                let team;
                if (type == 'spectators') {
                    let bool = (similarity(text.replace(/\r?\n|\r?\f/g, ''), 'SPECTAT') > .8)
                    cb(bool)
                    return;
                }
                if (victor == 'blue') {
                    team = (number > 2 ? orange : blue)
                } else {
                    team = (number > 2 ? blue : orange)
                }
                if (number > 2) {
                    number = number - 3;
                }
                if (type == 'name') {
                    team[number].name = text.split('\r')[0]
                } else if (type === 'score') {
                    team[number].score = text.replace(/\r?\n|\r?\f/g, '')
                }
                total++;
                if (total == 12) {
                    ValidateDataObject({ blue, orange }, victor, (iName, iScore) => {
                        createReturnImage(iName, iScore, currentImages, () => {
                            let matchID = tourneyMaster.nextMatchID;
                            message.channel.send(`**Please verify the following names/numbers for match #${matchID}!**`, {
                                files: [{
                                    attachment: './images/verification.jpg',
                                    name: 'asking.jpg'
                                }]
                            }).then(() => {
                                if (debug == true) {
                                    if (victor == 'blue') {
                                        message.channel.send(`\`\`\`JSON\n Blue:\n${JSON.stringify(blue, null, 1)}\n Orange:\n${JSON.stringify(orange, null, 2)}\`\`\``)
                                    } else {
                                        message.channel.send(`\`\`\`JSON\n Orange:\n${JSON.stringify(orange, null, 1)}\n Blue:\n${JSON.stringify(blue, null, 2)}\`\`\``)
                                    }
                                }
                                msgCollectorCallback({ blue, orange, iName, iScore, victor, overtime}, message.channel, matchID)
                            })
                        })
                    })
                }

            })
            .catch(err => {
                console.log('error:', err)
            })
    }

}

function getAttachment(message) {
    let attachment = null;
    for (let x of message.attachments.keys()) {
        attachment = message.attachments.get(String(x));
    }
    return attachment
}

function ValidateDataObject(teams, victor, callback) {
    let { blue, orange } = teams;
    let incorrectName = []
    let incorrectScore = [];
    for (let i = 0; i < 6; i++) {
        let a;
        let curTeam;
        let curTeamStr;
        if (victor == 'blue') {
            curTeam = (i < 3 ? blue : orange)
            curTeamStr = (i < 3 ? 'blue' : 'orange')
        } else {
            curTeam = (i < 3 ? orange : blue)
            curTeamStr = (i < 3 ? 'orange' : 'blue')
        }

        if (i < 3) {
            a = i
        } else {
            a = i - 3
        }

        let name = curTeam[a].name;
        let match = name.match(/((\[|{|\()[\s\S]{1,4}(\]|}|\)))+/g);
        let doesExist = false;
        if (match !== null) name = name.replace(match[0] + ' ', '');
        name = name.toLowerCase().trim().replace(/ /g, '');
        let highestMatch = '';
        let highestSimilarity = 0;
        for (let x in players) {
            let s = similarity(name, players[x]);
            if (s > highestSimilarity) {
                highestMatch = players[x];
                highestSimilarity = s;
            }
        }
        if (highestSimilarity > .7) doesExist = true;
        if (doesExist == false) incorrectName.push({ team: curTeamStr, player: curTeam[a], number: i })
        if (doesExist == true) curTeam[a].name = highestMatch;
        let score = curTeam[a].score;
        if (score !== '') {
            switch (a) {
                case 0: {
                    if (score < curTeam[a + 1].score && score < curTeam[a + 2].score) {
                        incorrectScore.push({ team: curTeamStr, player: curTeam[a], number: i })
                    }
                    break;
                }
                case 1: {
                    if (score > curTeam[a - 1].score && score < curTeam[a + 1].score) {
                        incorrectScore.push({ team: curTeamStr, player: curTeam[a], number: i })
                    }
                    break;
                }
            }
        } else {
            incorrectScore.push({ team: curTeamStr, player: curTeam[a], number: i })
        }
    }
    callback(incorrectName, incorrectScore)

}

function createReturnImage(iName, iScore, images, callback) {
    let currentAspectRatio = { width: 0, height: 0 };
    let imageArr = [];
    let imageArr2 = [];
    for (let x in iName) {
        let place = iName[x].number;
        let curImage = images.name[place];
        currentAspectRatio.width += curImage.bitmap.width;
        if (curImage.bitmap.height > currentAspectRatio.height) {
            currentAspectRatio.height = curImage.bitmap.height;
        }
        imageArr.push(curImage)
    }
    let altAspectRatio = { width: 0, height: 0 }
    for (let x in iScore) {
        let place = iScore[x].number;
        let curImage = images.score[place];
        altAspectRatio.width += curImage.bitmap.width;
        if (curImage.bitmap.height > altAspectRatio.height) {
            altAspectRatio.height = curImage.bitmap.height;
        }
        imageArr2.push(curImage)
    }
    if (altAspectRatio.width > currentAspectRatio.width) {
        currentAspectRatio.width = altAspectRatio.width
    }
    new Jimp(currentAspectRatio.width, currentAspectRatio.height + altAspectRatio.height, (err, img) => {
        let x = 0;
        let y = 0;
        for (let i in imageArr) {
            img.composite(imageArr[i].grayscale(), x, y)
            x += imageArr[i].bitmap.width
        }
        x = 0;
        y = currentAspectRatio.height;
        for (let i in imageArr2) {
            img.composite(imageArr2[i].grayscale(), x, y)
            x += imageArr2[i].bitmap.width
        }
        img.write('./images/verification.jpg')
        callback(img)
    })
}

function determineVictor(c) {
    let average = getAverageTeamColors([c[0], c[1], c[2]])
    if (average.b > average.r) return 'blue'
    return 'orange'
}

function getAverageTeamColors(t) {
    let total = { r: 0, g: 0, b: 0 }
    for (let i in t) {
        total.r += t[i].r;
        total.g += t[i].g;
        total.b += t[i].b;
    }
    total.r = total.r / 3;
    total.g = total.g / 3;
    total.b = total.b / 3;
    return total;
}