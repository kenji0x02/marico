// -- utils関数 --
// yyyyMMddHHmmを時間に変換
// javascriptにはstrftimeがない、、、
String.prototype.toTime = function() {
  var fullYear = this.substr(0, 4) - 0;
  var month = this.substr(4, 2) - 1;
  var date = this.substr(6, 2) - 0;
  var hours = this.substr(8, 2) - 0;
  var minutes = this.substr(10, 2) - 0;
  var second = 0;
  var time = new Date(fullYear, month, date, hours, minutes, second);
  return time;
};

// 経過時間をHH:mmで出力
function progressTime(startTime, endTime) {
  // 割り切れない場合は切り捨て
  var progressTimeTotalMinute = Math.floor((endTime.getTime() - startTime.getTime()) / 60000);
  var progressTimeMinute = progressTimeTotalMinute % 60;
  var progressTimeHour = (progressTimeTotalMinute - progressTimeMinute) / 60;
  if (progressTimeMinute < 10) {
    progressTimeMinute = "0" + progressTimeMinute;
  }
  return progressTimeHour + ":" + progressTimeMinute;
}

// -- 設定値 --
// urlからリモコンの種類を読み込む
var remoconName = location.href.split('/')[3];
if (remoconName == "") remoconName = "tv";
// チャンネルと放送局のマッピング
var channelNum = {
  nhk:   'ch1',
  etv:   'ch2',
  chiba: 'ch3',
  ntv:   'ch4',
  asahi: 'ch5',
  tbs:   'ch6',
  tokyo: 'ch7',
  fuji:  'ch8',
  mx:    'ch9'
};

// -- ソケットを受信したときの処理 --
var socket = io.connect();

socket.on('message', function(message) {
  programLists = JSON.parse(message);
  for(var station in programLists) {
    var domID = '#' + channelNum[station];
    var domIDSpan = domID + ' span.program-info';
    var beforeProgramInfo = $(domIDSpan).text();
    var beforeProgramInfoWidth = $(domIDSpan).width();

    // tag設定
    $(domID).attr('data-title', programLists[station]['title']);
    $(domID).attr('data-start-time', programLists[station]['startTime']);
    $(domID).attr('data-end-time', programLists[station]['endTime']);
    $(domID).attr('data-content', programLists[station]['content']);

    // 番組情報表示テキスト作成
    var iterateCnt = 3;
    var spacer = "　　";
    // 現在の表示情報を継承する
    var displayInfo = beforeProgramInfo;
    if(beforeProgramInfo.length == 0) spacer = "";

    for(var i = 0; i < iterateCnt; i++) {
      displayInfo = displayInfo + spacer + programLists[station]['title'];
      // 全角スペース２文字で間隔を空けて表示
      spacer = "　　";
    }
    $(domIDSpan).text(displayInfo);
    console.log("after2 witdh:" + $(domIDSpan).css('width'));
    console.log("fontsize:" + $(domIDSpan).css('font-size'));

    // 終了時の位置を計算
    var spacer = ($(domIDSpan).css('font-size').replace("px", "") - 0) * 2;// 全角スペース２文字分
    var marqueeWidth = $(domIDSpan).width();
    var offsetPosition = 0.25 * spacer;// 半角スペース分右にオフセットして表示
    console.log("spacer:" + spacer);
    console.log("marqueeWidth:" + marqueeWidth);
    if(beforeProgramInfo != 0) {
      marqueeWidth = marqueeWidth - beforeProgramInfoWidth - spacer;
    }
    var endPosition = 1.0 * (marqueeWidth - (iterateCnt - 1) * spacer) * (iterateCnt - 1) / iterateCnt + (iterateCnt - 1) * spacer - offsetPosition;
    console.log("endPosition:" + endPosition);

    // 開始時の位置
    // 親要素(anchor)のpaddingを含んだ横幅を開始位置として取得
    var startPosition = $(domID).innerWidth();
    if (beforeProgramInfo != 0) startPosition = offsetPosition;
    console.log('startPosition:' + startPosition);

    var marqueeOpt = {
      marquee: $(domIDSpan)
      , startPosition: startPosition
      , endPosition: endPosition
      , callbackText: programLists[station]['title']
      , callbackLeft: offsetPosition
    }
    $(domID).marquee(marqueeOpt);
  }
  // program-infoが開いているときだけ番組情報更新
  if (document.getElementById("program-info").clientHeight != 0) {
    // 表示中のチャンネルを取得
    var station = $('#program-info span.program-info-station-name').text();
    var channelId = "#" + channelNum[station];
    // 取得したチャンネル情報を更新
    updateProgramInfo($(channelId));
  }
});

// -- ボタンを押したときの動作 --
$('.btn').click(function(){
  var action = $(this).attr('id');
  // up-downボタンなどトグルだけで特に何も制御しなくてよい場合
  if (action == null) { return; }

  // リモコン操作
  commandEmit($(this));
  // ボタンの表示状態更新
  updateButtonCollapse(action);
  // 1ch〜9chまでのボタンでは番組情報表示
  if (action.match(/^ch[1-9]$/)) {
    updateProgramInfo($(this));
  }
  // クリック音を鳴らす
  playSound();
});

function commandEmit(elem){
  var action = elem.attr('id');
  // 開いているページのリモコン名と実際に使うリモコン名が違うとき更新する
  // 例：appletvリモコンでテレビリモコンを使いたいとき
  var transmitRemoconName = elem.attr('data-remocon-name') || remoconName;
  var command = {
    action: action,
    remoconName: transmitRemoconName
  }
  socket.emit('commandEmit', command);
};

function updateButtonCollapse(action){
  // 番組表／録画リスト表示ボタンを押したとき、
  // 矢印系が非表示だったら表示する
  if (action == "tvListings" || action == "recordList") {
    if (document.getElementById("arrowMode").clientHeight == 0) {
      $('#arrowMode').collapse('show');
    }
  }

  // 終了ボタンを押したとき、矢印系またはプレイ系が表示されていたら非表示に
  if (action == "finish") {
    if (document.getElementById("arrowMode").clientHeight != 0) {
      $('#arrowMode').collapse('hide');
    }
    if (document.getElementById("playMode").clientHeight != 0) {
      $('#playMode').collapse('hide');
    }
  }
};

// チャンネルボタンが押されたとき
function updateProgramInfo(elem){
  // 閉じているときだけ開く
  if (document.getElementById("program-info").clientHeight == 0) {
    $('#program-info').collapse('show');
  }
  // 属性更新
  updateTitle(elem);
  updateContent(elem);
  updateStation(elem);
  updateProgressTime(elem);
};

function updateTitle(elem) {
  var title = elem.attr('data-title');
  if (title == null) { title = ''; }
  $("#program-info h4").text(title);
};

function updateContent(elem) {
  var content = elem.attr('data-content');
  if (content == null) { content  = ''; }
  $("#program-info p").text(content);
};

function updateStation(elem) {
  var channel = elem.attr('id');
  var station = findStation(channel);
  if (station == null) { station  = ''; }
  $("#program-info span.program-info-station-name").text(station);
};

function findStation(channel){
  for(var key in channelNum) {
    if(channelNum[key] == channel) {
      return key;
    }
  }
  return false;
}

// 放送進捗率
function updateProgressTime(elem) {
  var startTime = (elem.attr('data-start-time'));
  if (startTime == null) {
    resetProgressTime();
    return;
  }
  startTime = startTime.toTime();

  var endTime = (elem.attr('data-end-time'));
  if (endTime == null) {
    resetProgressTime();
    return;
  }
  endTime = endTime.toTime();

  var nowTime = new Date();

  var percentage = (nowTime.getTime() - startTime.getTime()) / (endTime.getTime() - startTime.getTime());
  percentage = parseInt(percentage * 100);
  var style = 'width: ' + percentage + '%;';
  $('#program-info .bar').attr('style', style);

  // 番組トータル時間と経過時間(YouTube風)
  var totalTime = progressTime(startTime, endTime);
  var nowProgressTime = progressTime(startTime, nowTime);
  $("#program-info span.start-time").text(nowProgressTime);
  $("#program-info span.end-time").text(totalTime);
};

function resetProgressTime() {
  var style = 'width: 0%;';
  $('#program-info .bar').attr('style', style);
  $("#program-info span.start-time").text('');
  $("#program-info span.end-time").text('');
};

// クリック音を鳴らす
function playSound() {
  document.getElementById("playSound").play();
};
