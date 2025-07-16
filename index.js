
  // -------------------------------------------------------------------------------------------
  // Constants
  // -------------------------------------------------------------------------------------------


  var kCONNECT      = "connection";
  var kLOGIN        = "login";
  var kLOGOUT       = "disconnect";
  var kNEW_MESSAGE  = "new message";
  var kNEW_TIME     = "new time";
  var kNEW_PLAYER   = "new player";
  var kUSER_JOINED  = "user joined";
  var kUSER_LEFT    = "user left";
  var kUSER_ADD     = "add user";
  var kSTARTED      = "started";
  var kSTOPPED      = "stopped";
  var kNEW_GAME = "new game";
  var kINIT_CARDS = "init cards";

  // -------------------------------------------------------------------------------------------
  // Initialize variables
  // -------------------------------------------------------------------------------------------


  var express = require('express');
  var app     = express();
  var server  = require('http').createServer(app);
  var io      = require('./server')(server);
  var port    = process.env.PORT || 12345;


  server.listen(port, function () {
    console.log('Server listening at port %d', port);
  });

  app.use(express.static(__dirname + '/public'));

  var numUsers      = 0;
  var players       = Array();
  var onlinePlayers = Array();
  var hostUser = null; // 新增 host 变量

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

  function getShuffledPairs() {
    // 1. 随机选8个
    let arr = images.slice();
    let selected = [];
    for (let i = 0; i < 8; i++) {
      let idx = Math.floor(Math.random() * arr.length);
      selected.push(arr.splice(idx, 1)[0]);
    }
    // 2. 复制一份
    let pairs = selected.concat(selected);
    // 3. 洗牌
    for (let i = pairs.length - 1; i > 0; i--) {
      let j = Math.floor(Math.random() * (i + 1));
      [pairs[i], pairs[j]] = [pairs[j], pairs[i]];
    }
    return pairs;
  }

  io.on(kCONNECT, function (socket) {
    var addedUser = false;

    socket.on(kNEW_MESSAGE, function (data) {
      socket.broadcast.emit(kNEW_MESSAGE, {
        username: socket.username,
        message: data
      });
    });

    socket.on(kNEW_GAME, function (data) {
      //创建卡牌
      var data = getShuffledPairs();

      io.emit(kINIT_CARDS, {
        message: data,
      });
    });

    socket.on(kNEW_TIME, function (data) {
      socket.broadcast.emit(kNEW_TIME, {
        message: data
      });
    });

    socket.on(kSTARTED, function (data) {
      socket.broadcast.emit(kSTARTED, {
        message: data
      });
    });

    socket.on(kSTOPPED, function (data) {
      socket.emit(kSTOPPED, {
        message: data
      });

      socket.broadcast.emit(kSTOPPED, {
        message: data
      });
    });

    socket.on(kUSER_ADD, function (username) {
      if (addedUser) return;

      socket.username = username;
      ++numUsers;
      players.push(username);

      // 分配host：第一个进来的人
      if (!hostUser) {
        hostUser = username;
      }

      addedUser = true;
      socket.emit(kLOGIN, {
        numUsers: numUsers,
        players : players,
        host: hostUser,
      });

      socket.broadcast.emit(kUSER_JOINED, {
        username: socket.username,
        numUsers: numUsers,
        players : players,
        host: hostUser,
      });
    });

    socket.on(kLOGOUT, function () {
      if (addedUser) {
        --numUsers;

        var idx = players.indexOf(socket.username);
        players.splice(idx, 1);

        // 如果host离开，分配新的host（如有其他人）
        if (hostUser === socket.username) {
          hostUser = players.length > 0 ? players[0] : null;
        }

        socket.broadcast.emit(kUSER_LEFT, {
          username: socket.username,
          numUsers: numUsers,
          players: players,
          host: hostUser,
        });
      }
    });
    
  });


