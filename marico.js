// -- 設定ファイル --
var conf = require('./marico.conf');

// -- express --
var express = require('express')
  , routes = require('./routes')
  , user = require('./routes/user')
  , http = require('http')
  , path = require('path')
  , partials = require('express-partials');

var app = express();

// load the express-partials middleware
// expressの設定の前に書くこと
app.use(partials());
// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

app.get('/', routes.index);
app.get('/users', user.list);
app.get('/appletv', routes.index2);

server = http.createServer(app);
server.listen(conf.socketio.port);

// -- コマンド送信用 --
var command = require('./lib/command');
command.setCodes(conf.remoconLists);

// -- 番組情報取得用 --
var scraping = require('./lib/scraping');
scraping.formatProgramList(conf.targetTVStation);

// -- socket.io --
io = require('socket.io').listen(server);
io.set('log level', 1);   // ログ出力を下げる

io.sockets.on('connection', function(socket) {
  // 初回接続時イベント
  scraping.getNowProgramLists(function(nowProgramLists) {
    console.log("log:(6)socket.volatile.json.send.");
    socket.volatile.json.send(JSON.stringify(nowProgramLists));
  })

  // クライアントからソケットが飛んできたときのイベント
  socket.on('commandEmit',function(req){
    console.log(req);
    command.transmit(req["remoconName"], req["action"], conf.hidDevice.device1);
  });

  // 繰り返しイベント
  var interval = setInterval(function() {
    // チャンネルデータをsocketでクライアントに送信
    // クライアント側でjQueryを使って番組タイトルを流す
    scraping.getNowProgramLists(function(nowProgramLists) {
      console.log("log:(6)socket.volatile.json.send.");
      socket.volatile.json.send(JSON.stringify(nowProgramLists));
    });
  }, conf.socketio.setInterval)

  // 切断時のイベント
  socket.on('disconnect', function(){
    clearInterval(interval);
  });
});
