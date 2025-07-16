$(function() 
{

  // -------------------------------------------------------------------------------------------
  // Constants
  // -------------------------------------------------------------------------------------------


  var kLOGIN        = "login";
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

  var kTIMEOUT      = 2;


  // -------------------------------------------------------------------------------------------
  // Initialize variables
  // -------------------------------------------------------------------------------------------


  var $window     = $(window);
  var $loginPage  = $('.login.page');
  var $chatPage   = $('.chat.page');
  var $cardPage = $(".card.page");

  var username;
  var playerInfo;

  var started = false;

  var socket = io();


  // -------------------------------------------------------------------------------------------
  // Functions
  // -------------------------------------------------------------------------------------------


  function setUsername ( user ) {
    username = user.name.trim();

    if (username) {
      $loginPage.fadeOut();
      $chatPage.show();

      socket.emit(kUSER_ADD, user);
    }
  }

  function toggleColor ( div ) {
    if ( div == "#players" || div == "#btnStart" || div == "#btnStop" ) return;

    $( "#players" ).children().css('opacity', '1');

    if ( $(div).css('opacity') == "0.5" ) {
      $(div).css('opacity', '1');
      $("#btnStart").prop('disabled', true);
    } else {
      $(div).css('opacity', "0.5");
      $("#btnStart").prop('disabled', false);
    }

    selectedPlayer = div;
  }
  
  function updateCountdown(event) {
    var format = '%H:%M:%S';
    $('#clock').html(event.strftime(format));
  }
  
  function deltaTime() {
    var dt = new Date();

    var month = dt.getMonth() + 1
    if (month < 10) month = "0" + month;
    var date = dt.getFullYear() + "/" + month + "/" + dt.getDate();
    var time = date + " " + dt.getHours() + ":" + (dt.getMinutes() + kTIMEOUT) + ":" + dt.getSeconds();
    
    return time;
  }

  function startTimer(time) {
    $('#clock').countdown(time)
      .on('update.countdown', function(event) {
          updateCountdown(event);
      })
      .on('finish.countdown', function(event) {
          $(this).html('00:0' + kTIMEOUT + ':00')
          .parent().addClass('disabled');

          if ( started ) {
            notifyMe();
            stopPressed();
          }
      });
  }

  function log(text, data) {
    console.log(">>> " + text);
    console.log(data);
  }

  function stopTimer() {
    startTimer("2000/10/28 10:28:00");
  }

  function addDivPlayers(data) {
    log("addDivPlayers", data);

    $("#players").empty();
    for ( var i=0; i<data.players.length; i++ ) {
        var player = data.players[i];
        $("#players").append('<div id="player' + player.name + '" class="col"><img class="circular" src="' + player.url + '" alt="' + player.name + '" /><div>' + player.displayName + '</div></div>');
    }

    $("#playersLogin #player" + player.name).empty();
  }

function playerSelected(elem) {
  if (started) return;
  // 用户名输入框id为user_name
  var $input = $("#user_name");
  var userNameVal = $input.length ? $input.val().trim() : null;
  // 错误提示div，假设id为user_name_error
  var $error = $("#user_name_error");
  if ($error.length === 0) {
    // 如果页面没有错误提示div，动态添加到输入框后面
    $error = $('<div id="user_name_error" style="color:red;margin-top:4px;"></div>');
    if ($input.length) $input.after($error);
  }
  if (!userNameVal) {
    $error.text('请输入用户名');
    $error.show();
    $input.focus();
    return;
  } else {
    $error.hide();
  }

  var item = "#player" + elem.target.alt;
  playerInfo = {
    name: elem.target.alt,
    url: elem.target.currentSrc,
    displayName: userNameVal
    
  };
  setUsername(playerInfo);
  toggleColor(item);
  socket.emit(kNEW_MESSAGE, item);
}

  function startPressed() {
    // 初始化卡牌
    socket.emit(kNEW_GAME, {});
  }

  function stopPressed() {
    $("#btnStop").prop('disabled', true);
    $("#btnStart").prop('disabled', false);

    started = false;
    socket.emit(kSTOPPED, started);
  }

  function notifyMe() {
    if (!Notification) {
      alert('Desktop notifications not available in your browser. Try Chrome.'); 
      return;
    }

    if (Notification.permission !== "granted")
      Notification.requestPermission();
    else {
      var notification = new Notification('Turn-Based socket!', {
        icon: 'https://dl.dropboxusercontent.com/u/11796049/BME/images/pin.png',
        body: "!!! your time is expired !!!",
      });

      notification.onclick = function () { };
    }
  }

  function renderHostControlled(data) {
    console.log("renderHostControlled", data);
    if (
        data.host &&
        playerInfo &&
        playerInfo.displayName === data.host.displayName
    ) {
      $("#btnStart").show();
    } else {
      $("#btnStart").hide();
    }
  }
  // -------------------------------------------------------------------------------------------
  // Main
  // -------------------------------------------------------------------------------------------


  stopTimer();

  if (Notification.permission !== "granted") {
    Notification.requestPermission();
  }


  // -------------------------------------------------------------------------------------------
  // Click events
  // -------------------------------------------------------------------------------------------

  $('[id^="player"]').click(function (elem) {
    playerSelected(elem);
  });

  $("#btnStart").click(function (elem) {
    startPressed();
  });

  $("#btnStop").click(function (elem) {
    stopPressed();
  });


  // -------------------------------------------------------------------------------------------
  // Socket events
  // -------------------------------------------------------------------------------------------
  socket.on(kINIT_CARDS, function (data) {
    $("#btnStart").prop("disabled", true);
    $("#btnStop").prop("disabled", false);
    $chatPage.fadeOut();
    $cardPage.show();

    log(kINIT_CARDS, data);
    var cardsHtml = "";
    data.message.forEach(function (item, index) {
      cardsHtml += `
          <div class="card-container col" data-name="${item}">
            <div class="card-inner">
              <div class="card-front"><img src="images/back.png"></div>
              <div class="card-back"><img src="images/${item}.png"></div>
            </div>
          </div>
        `;
    });
    $("#cards").html(cardsHtml);
  });

  socket.on(kLOGIN, function (data) {
    log(kLOGIN, data);
    addDivPlayers(data);
    renderHostControlled(data);
  });

  socket.on(kNEW_MESSAGE, function (data) {
    log(kNEW_MESSAGE, data);
    toggleColor(data.message);
  });

  socket.on(kNEW_TIME, function (data) {
    log(kNEW_TIME, data);
    startTimer(deltaTime(data.message));
  });

  socket.on(kNEW_PLAYER, function (data) {
    log(kNEW_PLAYER, data);
  });

  socket.on(kUSER_JOINED, function (data) {
    log(kUSER_JOINED, data);
    addDivPlayers(data);
    renderHostControlled(data);
  });

  socket.on(kUSER_LEFT, function (data) {
    log(kUSER_LEFT, data);
    addDivPlayers(data);
    renderHostControlled(data);
  });

  socket.on(kSTARTED, function (data) {
    log(kSTARTED, data);

    $("#btnStop").prop('disabled', !data);
    $("#btnStart").prop('disabled', data);

    started = true;
  });

  socket.on(kSTOPPED, function (data) {
    log(kSTOPPED, data);

    $("#btnStop").prop('disabled',  data);
    $("#btnStart").prop('disabled', data);
    $("#players").children().css('opacity', '1');

    started = false;
    stopTimer();
  });

});


