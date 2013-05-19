// クリック音を鳴らす
function playSound() {
  document.getElementById("playSound").play();
}

var socket = io.connect();

// urlからリモコンの種類を読み込む
var remoconName = location.href.split('/')[3];
if (remoconName == "") remoconName = "tv";

function commandEmit(action){
  playSound();
  var command = {
    action: action,
    remoconName: remoconName
  }

  socket.emit('commandEmit', command);

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
}

// ソケットを受信したときの処理
socket.on('message', function(message) {
  programLists = JSON.parse(message);
  for(var station in programLists) {
    var domID = '#' + station;
    var domIDSpan = domID + ' span.program-info';
    var beforeProgramInfo = $(domIDSpan).text();
    var beforeProgramInfoWidth = $(domIDSpan).width();

    // 番組情報表示テキスト作成
    var iterateCnt = 3;
    var spacer = "　　";
    // 現在の表示情報を継承する
    var displayInfo = beforeProgramInfo;
    if(beforeProgramInfo.length == 0) spacer = "";

    for(var i = 0; i < iterateCnt; i++) {
      displayInfo = displayInfo + spacer + programLists[station];
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
      , callbackText: programLists[station]
      , callbackLeft: offsetPosition
    }
    $(domID).marquee(marqueeOpt);
  }
});

// リモコン指定バージョン
function commandEmitWithRemocon(specifiedRemoconName, action){
  playSound();
  var command = {
    action: action,
    remoconName: specifiedRemoconName
  }

  socket.emit('commandEmit', command);
  console.log("command emit");
}
