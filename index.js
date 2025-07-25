// -------------------------------------------------------------------------------------------
// Constants
// -------------------------------------------------------------------------------------------


var kCONNECT = "connection";
var kLOGIN = "login";
var kLOGOUT = "disconnect";
var kNEW_MESSAGE = "new message";
var kNEW_TIME = "new time";
var kNEW_PLAYER = "new player";
var kUSER_JOINED = "user joined";
var kUSER_LEFT = "user left";
var kUSER_ADD = "add user";
var kSTARTED = "started";
var kSTOPPED = "stopped";
var kNEW_GAME = "new game";
var kINIT_CARDS = "init cards";
var kCLICK_CARDS = "click cards";
var kFLIP_CARDS = "slip cards";
var kSWITCH_USER = "switch user";
var kUPDATE_SCORE = "update score";
var kREGISTER = "register";
var kREJOIN = "rejoin";
// -------------------------------------------------------------------------------------------
// Initialize variables
// -------------------------------------------------------------------------------------------


var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('./server')(server);
var port = process.env.PORT || 12345;
var currentUser;
var score;
var gameStatus = "open"; // 游戏状态

server.listen(port, function () {
    console.log('Server listening at port %d', port);
});

app.use(express.static(__dirname + '/public'));

var numUsers = 0;
var players = Array();
var onlinePlayers = Array();
var hostUser = null; // 新增 host 变量
var clients = Array();

var images = [
    "hamburger",
    "sofa",
    "hotdog",
    "sausage",
    "bread",
    "cheese",
    "bed",
    "light",
    "drink",
    "coffee",
];

// 用来存储卡牌及状态
let cardsGenerated;
// 用来存储临时翻转的牌
let tempSelected = {};

function getShuffledPairs() {
    // 1. 随机选8个
    let arr = images.slice();
    let selected = [];
    for (let i = 0; i < 8; i++) {
        let idx = Math.floor(Math.random() * arr.length);
        selected.push({image: arr.splice(idx, 1)[0], flipped: false});
    }
    // 2. 复制一份
    let pairs = selected.concat(selected.map(card => ({...card})));
    // 3. 洗牌
    for (let i = pairs.length - 1; i > 0; i--) {
        let j = Math.floor(Math.random() * (i + 1));
        [pairs[i], pairs[j]] = [pairs[j], pairs[i]];
    }
    cardsGenerated = pairs;
    console.log(pairs);
    return pairs;
}

io.on(kCONNECT, function (socket) {
    var addedUser = false;

    socket.on(kNEW_MESSAGE, function (data) {
        socket.broadcast.emit(kNEW_MESSAGE, {
            username: socket.user,
            message: data
        });
    });

    socket.on(kNEW_GAME, function (data) {
        gameStatus = "in progress";
        //创建卡牌
        var data = getShuffledPairs();

        io.emit(kINIT_CARDS, {
            message: data,
            currentUser: currentUser
        });

        //初始化计分板
        score = {
            total: 8,
            matched: 0,
            playersWithScore: players.map(player => ({
                username: player.displayName,
                sessionId: player.sessionId,
                score: 0
            })),
        };
        io.emit(kUPDATE_SCORE, score);
    });

    socket.on(kREJOIN, function (data) {
        // 重新加入游戏
        if (gameStatus === "in progress") {
            // 检查players里面是否存在当前用户
            console.log("players" + players);
            const existingPlayer = score.playersWithScore.find(player => player.sessionId === data.sessionId);
            if (existingPlayer) {
                addedUser = true;
                // 重新发送当前游戏状态
                socket.emit(kINIT_CARDS, {
                    message: cardsGenerated,
                    currentUser: currentUser
                });
            } else {
                socket.emit(kSTOPPED, {message: "Game started, please wait for the next round."});
            }
        }

    });

    socket.on(kNEW_TIME, function (data) {
        socket.broadcast.emit(kNEW_TIME, {
            message: data
        });
    });

    socket.on(kUSER_ADD, function (user) {
        if (addedUser) return;

        socket.user = user;
        ++numUsers;
        players.push(user);

        // 分配host：第一个进来的人
        if (!hostUser) {
            hostUser = user;
        }

        if (!currentUser) {
            currentUser = user;
        }

        addedUser = true;
        socket.emit(kLOGIN, {
            numUsers: numUsers,
            players: players,
            host: hostUser,
        });

        socket.broadcast.emit(kUSER_JOINED, {
            username: socket.user,
            numUsers: numUsers,
            players: players,
            host: hostUser,
        });
    });

    socket.on(kLOGOUT, function () {
        if (addedUser) {
            --numUsers;

            var idx = players.indexOf(socket.user);
            players.splice(idx, 1);

            // 如果host离开，分配新的host（如有其他人）
            if (hostUser === socket.user) {
                hostUser = players.length > 0 ? players[0] : null;
            }

            socket.broadcast.emit(kUSER_LEFT, {
                username: socket.user,
                numUsers: numUsers,
                players: players,
                host: hostUser,
            });
        }
    });

    socket.on(kCLICK_CARDS, function (data) {
        if (typeof tempSelected.index === "undefined") {
            tempSelected = {index: data, data: cardsGenerated[data]};
            cardsGenerated[data].flipped = true; //更新已经翻转的card的flip为true
            console.log(cardsGenerated)
            io.emit(kCLICK_CARDS, data);
        } else if (tempSelected.data.image === cardsGenerated[data].image) {
            // 更新card的状态
            cardsGenerated[data].flipped = true; //更新第二次翻转的card的flip为true

            tempSelected = {};
            // Match found
            score = {
                total: 8,
                matched: score.matched + 1,
                playersWithScore: score.playersWithScore.map(playerScore => ({
                    username: playerScore.username,
                    sessionId: playerScore.sessionId,
                    score: playerScore.sessionId === currentUser.sessionId
                        ? playerScore.score + 1
                        : playerScore.score
                })),
            };

            if (score.matched === score.total) {
                // 选出胜利者
                const maxScore = Math.max(...score.playersWithScore.map(p => p.score));
                const winners = score.playersWithScore.filter(p => p.score === maxScore);


                // 游戏结束，发送消息，给胜利和失败发送不同的消息
                gameStatus = "over";
                winners.forEach(winner => {
                    const client = clients.find(c => c.sessionId === winner.sessionId);
                    console.log(client)
                    if (client) {
                        io.to("/#" + client.socketId).emit(kSTOPPED, {message: "Game Over! You win!"});
                    }
                });
                const loserClients = clients.filter(c => !winners.some(w => w.sessionId === c.sessionId));
                loserClients.forEach(loser => {
                    io.to("/#" + loser.socketId).emit(kSTOPPED, {message: "Game Over! You lose!"});
                });
            }
            io.emit(kCLICK_CARDS, data);

            io.emit(kUPDATE_SCORE, score);
        } else {
            // Not matched
            const tempData = [tempSelected.index, data];
            cardsGenerated[tempSelected.index].flipped = false; //更新已经翻转的card的flip为false
            tempSelected = {};
            io.emit(kFLIP_CARDS, tempData);
            currentUser = players[(players.indexOf(currentUser) + 1) % players.length];
            io.emit(kSWITCH_USER, currentUser);
        }

    });

    socket.on(kREGISTER, function (data) {
        const existingClient = clients.find(client => client.sessionId === data.sessionId);
        if (existingClient) {
            existingClient.socketId = data.socketId;
        } else {
            clients.push({socketId: data.socketId, sessionId: data.sessionId});
        }
        console.log(clients);
    });
});


