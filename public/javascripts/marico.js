// -- 名前空間の宣言 --

var MARICO = MARICO || {};

// -- 設定値 --

// チャンネルと放送局のテーブル
// ユーザー毎に違う設定
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

$(function(){

  // -- Model --

  // 各テレビ局の情報
  var TVStation = Backbone.Model.extend({

    defaults: {
      title: '',
      content: '',
      startTime: 0,
      endTime: 0,
      totalTime: '',
      nowProgressTime: '',
      percentage: 0
    },

    // 値が妥当かどうかの判断
    // ここでは真偽判断だけで値を書き換えたりはしない
    validate: function(attrs) {
      _.each(attrs, function(value, key){
        if (value == null) {
          console.log("error:validate:" + key);
        }
      });
    },

    // 受信したsocketからモデルを更新
    update: function(socketData) {
      var socketRapper = new SocketRapper(socketData);

      if (this._isUpdate(socketRapper)) {
        this.set({
          title: socketRapper.get('title'),
          content: socketRapper.get('content'),
          startTime: socketRapper.get('startTime'),
          endTime: socketRapper.get('endTime')
        }, {validate: true, silent: true});
      }

      // 番組トータル時間と経過時間(YouTube風)
      // 毎回更新
      var nowTime = new Date();
      var progressTime = nowTime.getTime() - this.get('startTime').getTime();
      var totalTime = this.get('endTime').getTime() - this.get('startTime').getTime();
      var percentage = parseInt(progressTime / totalTime * 100);

      this.set({
        totalTime: MARICO.utils.timeToHHmm(totalTime),
        nowProgressTime: MARICO.utils.timeToHHmm(progressTime),
        percentage: percentage
      }, {validate: true});
    },

    _isUpdate: function(socketRapper) {
      // 初回socket受信時はupdate
      if (this.get('startTime') == null) {
        return true;
      }
      // ひとつ前のsocketの開始時刻と同じ場合は同じ番組なのでupdateしない
      if (socketRapper.get('startTime').toString() == this.get('startTime').toString()) {
        return false;
      }
      return true;
    }
  });

  // socketのラッパー用モデル
  // ここまでする必要はないかもしれないけど、TVStationModelとsocketを疎結合させるために追加
  var SocketRapper = Backbone.Model.extend({
    initialize: function(socketData) {
      this.set({
        title: socketData.title || '',
        content: socketData.content || '',
        startTime: socketData.startTime.toTime(),
        endTime: socketData.endTime.toTime()
      });
    }
  });

  // -- Collection --

  var TVStations = Backbone.Collection.extend({

    // Reference to this collection's model.
    model: TVStation,

    // 受信したsocketをモデルに設定する
    socketSet: function(programLists) {
      var collection = this;
      _.each(programLists, function(value, stationName) {
        collection.get(channelNum[stationName]).update(value);
      });
    }
  });

  var tvStations = new TVStations;

  // -- View --

  var TVStationView = Backbone.View.extend({

    initialize: function() {
      // 各TVStationのモデルとひもづける
      this.listenTo(this.model, 'change', this.render);
    },

    events: {
      'click': 'renderWatchingTVProgram'
    },

    // 直接viewのインスタンスを操作しているのであまりよくない。
    // オブザーバーを使った方がいいけどそこまでしなくていいかなって気も。。。
    renderWatchingTVProgram: function(e) {
      watchingTVProgramView.render(this.model);
    },

    render: function() {
      var domIDSpan = this.$('.program-info');

      var beforeDisplayInfo = domIDSpan.text();
      var beforeDisplayInfoWidth = domIDSpan.width();

      // 番組情報表示テキスト作成
      var iterateCnt = 3;
      var spacer = "　　";
      // 現在の表示情報を継承する
      var displayInfo = beforeDisplayInfo;
      if(beforeDisplayInfo.length == 0) spacer = "";

      for(var i = 0; i < iterateCnt; i++) {
        displayInfo = displayInfo + spacer + this.model.get('title');
        // 全角スペース２文字で間隔を空けて表示
        spacer = "　　";
      }
      domIDSpan.text(displayInfo);

      // 終了時の位置を計算
      var spacer = (domIDSpan.css('font-size').replace("px", "") - 0) * 2;// 全角スペース２文字分
      var marqueeWidth = domIDSpan.width();
      var offsetPosition = 0.25 * spacer;// 半角スペース分右にオフセットして表示
      if(beforeDisplayInfo != 0) {
        marqueeWidth = marqueeWidth - beforeDisplayInfoWidth - spacer;
      }
      var endPosition = 1.0 * (marqueeWidth - (iterateCnt - 1) * spacer) * (iterateCnt - 1) / iterateCnt + (iterateCnt - 1) * spacer - offsetPosition;

      // 開始時の位置
      // 親要素(anchor)のpaddingを含んだ横幅を開始位置として取得
      var startPosition = this.$el.innerWidth();
      if (beforeDisplayInfo != 0) startPosition = offsetPosition;

      var marqueeOpt = {
        marquee: domIDSpan
        , startPosition: startPosition
        , endPosition: endPosition
        , callbackText: this.model.get('title')
        , callbackLeft: offsetPosition
      }
      this.$el.marquee(marqueeOpt);

      // 番組進捗率
      var heightStyle = 'height: ' + this._calcProgressBarHeight() + 'px;'
      this.$('.station-btn-progress').attr('style', heightStyle);
      var style = 'width: ' + this.model.get('percentage')+ '%;';
      this.$('.bar').attr('style', style);

      return this;
    },

    _calcProgressBarHeight: function() {
      var minute = (this.model.get('endTime').getTime() - this.model.get('startTime').getTime())/60000;
      // 60分で4ピクセル
      var height = Math.round(minute / 60 * 4);
      // 最小1ピクセル
      if (height < 1) {
        return 1;
      }
      // 1時間30分以上は6ピクセル
      if (height >= 6) {
        return 6;
      }
      return height;
    }

  });

  // class="tvchannel"の要素の数だけviewを作る
  $(".tvchannel").each(function(index, elem){
    // collectionにmodel追加
    tvStations.add({
      id: elem.id,
      // チャンネル番号毎にテレビ局は固定なので、最初に設定しておく
      // keyとvalueを入れ替えてvalue(チャンネル番号)からkey(station)を探す
      station: _.invert(channelNum)[elem.id]
    });

    // view作成
    // newされたオブジェクトは配列として保持される
    new TVStationView({
      el: elem,
      model: tvStations.get(elem.id)
    });
  });

  // 現在視聴中の番組情報表示
  var WatchingTVProgramView = Backbone.View.extend({

    // ビューメソッドによる描画
    render: function(watchingTVProgram) {
      this.$("h4").text(watchingTVProgram.get('title'));
      this.$("p").text(watchingTVProgram.get('content'));
      this.$(".program-info-station-name").text(watchingTVProgram.get('station'));
      this.$('.start-time').text(watchingTVProgram.get('nowProgressTime'));
      this.$('.end-time').text(watchingTVProgram.get('totalTime'));
      // 番組進捗率
      var style = 'width: ' + watchingTVProgram.get('percentage') + '%;';
      this.$('.bar').attr('style', style);

      // DOMを作成してから必要があれば表示
      this._show();

      // 全ての購読を取り止めて（メモリーリーク対策）、新たに購読する
      this.stopListening();
      this.listenTo(watchingTVProgram, 'change', this.render);

      // renderしたらreturn this
      return this;
    },

    close: function() {
      this.stopListening();
    },

    // 閉じているときだけ開く
    _show: function() {
      if (this.el.clientHeight == 0) {
        this.$el.collapse('show');
      }
    }
  });

  var watchingTVProgramView = new WatchingTVProgramView({
    el: $('#program-info')
  });

  // View全体の管理
  var MaricoView = Backbone.View.extend({

    initialize: function() {
      console.log('log:initialize MaricoView');
      this.listenTo(Backbone, 'click', this.manageAllClickEvent);
    },

    manageAllClickEvent: function(elem) {
      console.log('click');
      var action = elem.id;
      // up-downボタンなどトグルだけで特に何も制御しなくてよい場合
      // DOMの要素（id）を見ているので判定はnullじゃなくて空白文字
      if (action == '') { return; }

      // リモコン操作
      MARICO.socketController.commandEmit(elem);

      // ボタンの表示状態更新
      this._updateButtonCollapse(action);

      // クリック音を鳴らす
      // playSound();
      MARICO.sound.click();
    },

    _updateButtonCollapse: function(action){
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

      // 番組情報を非表示にしたとき、watchingTVProgramViewのモデル購読を中止
      if (action == 'closeDisplayInfo') {
        watchingTVProgramView.close();
      }
    }
  });

  var App = new MaricoView;

  // すべてのclickイベントを監視
  $('.btn').click(function(){
    Backbone.trigger('click', this);
  });

  // -- ソケットを受信したときの処理 --

  var socket = io.connect();

  socket.on('message', function(message) {
    var programLists = JSON.parse(message);
    // collectionにsocketのデータを設定
    tvStations.socketSet(programLists);
  });

  MARICO.socketController = (function(){
    // [private property]
    // urlからリモコンの種類を読み込む
    var remoconName = location.href.split('/')[3] || "tv";

    // [public method]
    return {
      commandEmit: function(elem){
        var action = elem.id;
        // 開いているページのリモコン名と実際に使うリモコン名が違うとき更新する
        // 例：appletvリモコンでテレビリモコンを使いたいとき
        var transmitRemoconName = elem.getAttribute('data-remocon-name') || remoconName;
        var command = {
          action: action,
          remoconName: transmitRemoconName
        }
        socket.emit('commandEmit', command);
      }
    };
  }());

  // -- クリック音を鳴らす --

  MARICO.sound = (function(){
    // [public method]
    return {
      click: function() {
        document.getElementById("playSound").play();
      }
    };
  }());

  // -- utils関数 --

  MARICO.utils = (function(){
    return {
      // time変数をHH:mmで出力する
      timeToHHmm: function(time) {
        // 型チェック
        if (typeof(time) != 'number' ) {
          return ''
        }
        // 割り切れない場合は切り捨て
        var progressTimeTotalMinute = Math.floor(time / 60000);
        var progressTimeMinute = progressTimeTotalMinute % 60;
        var progressTimeHour = (progressTimeTotalMinute - progressTimeMinute) / 60;
        if (progressTimeMinute < 10) {
          progressTimeMinute = "0" + progressTimeMinute;
        }
        return progressTimeHour + ":" + progressTimeMinute;
      }
    };
  }());

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

  Number.prototype.toTime = function() {
    var toString = this + '';
    return toString.toTime();
  };

  // iPhoneのURLバーを隠す
  setTimeout(scrollTo, 100, 0, 1);
});
