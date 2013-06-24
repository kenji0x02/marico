// msnのテレビ番組表から番組情報を抽出

var jsdom    = require('jsdom').jsdom;
var fs = require('fs');
var jquery = fs.readFileSync('./public/javascripts/lib/jquery.min.js').toString();
var request = require('request');
var utils = require('./utils');

// ハッシュからクエリストリングを返す
createQueryString = function(queryParam) {
  var enc = encodeURIComponent;
  var str = '', amp = '';
  if(!queryParam) return '';
  for(var i in queryParam){
    str = str + amp + i + '=' + enc(queryParam[i]);
    amp = '&';
  }
  return str;
};

// 番組表
var programList = {};
// 番組表を取得するテレビ局
var targetTVStation = {};

module.exports.formatProgramList = function(tvStation) {
  targetTVStation = tvStation;
  // 配列として初期化
  for (var station in targetTVStation) {
    programList[targetTVStation[station]] = [];
  };
};

scrapingProgramList = function(url, now, callback) {
  console.log("log:(4)scrapingProgramList");
  var scrapingStartTime = new Date();
  jsdom.env({
    html: url,
    src: [jquery],
    features: {
      // 外部リソースを取得／時効しない→処理速度は変わらないけど、、、
      FetchExternalResources  : false,
      ProcessExternalResources: false,
    },
    done: function (errors, window) {
      window.$('#bigtable div').each(function(index, elem) {
        var anchor = window.$(elem).find('a');
        var onMouseOverElem = anchor.attr('onmouseover');
        var h1 = onMouseOverElem.match(/<h1>(.+)<\/h1>/);
        var h2 = onMouseOverElem.match(/<h2>(.+)<\/h2>/);
        // チャンネル
        var channel = h2[1].split("　")[0];// 全角スペースで分割
        if (channel in targetTVStation) {
          channel = targetTVStation[channel];
        }else {
          // each文から抜ける／for文でのcontinueの代わり
          console.log("break");
          return true;
        }

        // 番組名
        var title = h1[1];
        // /<img src=(.+)>/でマッチングすると入れ子のときに対応できないので全通り直接マッチングする
        title = title.replace("<img src=http://img.tv.msn.co.jp/s/ico_moji.gif>","");
        if (title == "<img src=http://img.tv.msn.co.jp/s/ico_tenki.gif>") {
          title = title.replace("<img src=http://img.tv.msn.co.jp/s/ico_tenki.gif>","天気予報");
        }
        if (title == "<img src=http://img.tv.msn.co.jp/s/ico_n.gif>") {
          title = title.replace("<img src=http://img.tv.msn.co.jp/s/ico_n.gif>","ニュース");
        }
        title = title.replace("<img src=http://img.tv.msn.co.jp/s/ico_tenki.gif>","");
        title = title.replace("<img src=http://img.tv.msn.co.jp/s/ico_n.gif>","");
        title = title.replace("<img src=http://img.tv.msn.co.jp/s/ico_sai.gif>","（再）");
        title = title.replace("<img src=http://img.tv.msn.co.jp/s/ico_taju.gif>","");
        title = title.replace("<img src=http://img.tv.msn.co.jp/s/ico_zen.gif>","（前編）");
        title = title.replace("<img src=http://img.tv.msn.co.jp/s/ico_kou.gif>","（後編）");
        title = title.replace("<img src=http://img.tv.msn.co.jp/s/ico_eiga.gif>","");
        title = title.replace("<img src=http://img.tv.msn.co.jp/s/ico_taju.gif>","");
        title = title.replace("<img src=http://img.tv.msn.co.jp/s/ico_shin.gif>","");
        // 念のため一番最後にやっとく
        title = title.replace(/<img src=(.+)>/g, "");
        // 全角→半角変換
        title = title.toOneByteAlphaNumeric();
        title = title.toOneByteSpace();

        // 番組開始時刻取得
        var onClickElem = anchor.attr("onclick");
        var segments = onClickElem.split(/&/);
        var sdate = "";
        var sminutes = "";
        var shour = "";
        var startTime = "";
        for(var i = 0; i < segments.length; i++) {
          var piece = segments[i].split(/=/);
          if(piece[0] == "sdate") sdate = piece[1];
          if(piece[0] == "shour") {
            // なぜだかhour情報だけ0-9のき一桁の数字
            if (piece[1].length == 1) piece[1] = "0" + piece[1];
            shour = piece[1];
          }
          if(piece[0] == "sminutes") sminutes = piece[1];
        }
        if (sdate != "" && shour != "" && sminutes != "") startTime = sdate + shour + sminutes;
        if(startTime.length != 12) console.log("error:startTime is bad.");
        // 数値に変換
        startTime = startTime - 0;

        // 番組終了時間設定
        var endAth2 = h2[1].split("　")[1].split("～")[1];
        var hour = endAth2.split(/:/)[0];
        var minute = endAth2.split(/:/)[1];
        var asisEndTime = sdate + hour + minute;
        var endTime = asisEndTime;
        // 日跨ぎのときendTimeの方が早い
        if ((asisEndTime - 0) - (startTime - 0) < 0) {
          var vFullYear = asisEndTime.substr(0, 4) - 0;
          var vMonth = asisEndTime.substr(4, 2) - 1;
          var vDay = asisEndTime.substr(6, 2) - 0;
          var vHour = asisEndTime.substr(8, 2) - 0;
          var vMinute = asisEndTime.substr(10, 2) - 0;
          var vSecond = 0;
          // 1日足す
          vDay += 1;
          var endTimeAddedOneDay = new Date(vFullYear, vMonth, vDay, vHour, vMinute, vSecond);
          endTime = endTimeAddedOneDay.yyyyMMddHHmm();
          console.log("log:endTime is bad.");
        }
        endTime = endTime - 0;

        // 番組内容
        var content = onMouseOverElem.match(/<p>(.+)<\/p><p>/);
        if (content != null) {
          content = content[1];
          content = content.replace("<img src=http://img.tv.msn.co.jp/s/ico_tenki.gif>","天気予報");
          content = content.replace("<img src=http://img.tv.msn.co.jp/s/ico_n.gif>","ニュース");
          content = content.replace("<img src=http://img.tv.msn.co.jp/s/ico_moji.gif>","");
          content = content.replace("<img src=http://img.tv.msn.co.jp/s/ico_sai.gif>","（再）");
          content = content.replace("<img src=http://img.tv.msn.co.jp/s/ico_taju.gif>","");
          content = content.replace("<img src=http://img.tv.msn.co.jp/s/ico_zen.gif>","（前編）");
          content = content.replace("<img src=http://img.tv.msn.co.jp/s/ico_kou.gif>","（後編）");
        }

        // 番組情報
        var programInfo = {
          title: title,
          content: content,
          startTime: startTime,
          endTime: endTime
        }
        // テレビ局毎のデータとしてまとめる
        programList[channel].push(programInfo);
      });
      // 処理速度計測
      var scrapingEndTime = new Date();
      console.log("log:scrapingTime[ms]:" + (scrapingEndTime - scrapingStartTime));
      console.log('log:scrapingProgramList end.');
      callback(now);
    }
  })
};

// 番組情報を更新
updateProgramList = function(now, callbackSocketSend) {
  console.log("log:(3)updateProgramList");
  var nowTimeyyyyMMddHHmm = now + "";

  var queryParam = {
    site: "032", // 固定値
    mode: "06", // 固定値
    category: "sg", // 固定値
    area: "012", // 千葉：012, 東京：013
    template: "program", // 固定値
    sdate: "20130430", // 番組表の開始日startData
    shour: "23", // 番組表の開始時刻startHour(いちおう0-23で。それ以外でもおkだけど)
    lhour: "3" // 番組表の長さlengthHour。shourが23でlhourが6だと翌日の4時台までのデータが返ってくる
  }
  // クエリーに現在時刻を設定
  queryParam["sdate"] = nowTimeyyyyMMddHHmm.substr(0, 8);
  queryParam["shour"] = nowTimeyyyyMMddHHmm.substr(8, 2);
  // ターゲットURL
  var url = 'http://program.tv.jp.msn.com/tv.php?';
  url = url + createQueryString(queryParam);
  console.log("log:url:" + url);

  // programList登録用の時間
  var programListStartTime = nowTimeyyyyMMddHHmm.substr(0, 10);
  programListStartTime = programListStartTime - 0;
  console.log("log:programListStartTime:" + programListStartTime);

  var lengthHour = queryParam['lhour'] - 1;
  var nowTime = new Date();
  nowTime.setHours(nowTime.getHours() + lengthHour);
  var programListEndTime = nowTime.yyyyMMddHHmm().substr(0,10);
  programListEndTime = programListEndTime - 0;
  console.log("log:programListEndTime:" + programListEndTime);

  // 初期化
  programList = {};
  // 配列として初期化
  for (var station in targetTVStation) {
    programList[targetTVStation[station]] = [];
  }
  // 番組表の開始時刻と終了時刻を登録
  programList['startTime'] = programListStartTime;
  programList['endTime'] = programListEndTime;

  // 番組情報を取得
  scrapingProgramList(url, now, function(now){
    var nowProgramLists = selectNowProgramLists(now);
    callbackSocketSend(nowProgramLists);
  });
};

// 現在時刻の番組表を取得
module.exports.getNowProgramLists = function(callbackSocketSend){
  console.log("log:(1)getNowProgramLists");
  // 現在時刻設定(yyyyMMddHHmm)
  var nowTime = new Date();
  now = nowTime.yyyyMMddHHmm() - 0;

  if(!checkWithinProgramList(now)) {
    // 現在のデータが番組表にないときは番組表を更新してからソケット投げる
    console.log("log:not exist in programList.")
    updateProgramList(now, function(nowProgramLists){
      callbackSocketSend(nowProgramLists);
    });
  }else {
    // 現在のデータが番組表にあるときは番組情報を取り出してソケットなげる
    var nowProgramLists = selectNowProgramLists(now);
    callbackSocketSend(nowProgramLists);
  }
};

// 各チャンネルの今の番組を選択(存在は確認済み)
selectNowProgramLists = function(now) {
  console.log("log:(5)selectNowProgramLists.");
  var nowProgramLists = {};
  for (var station in targetTVStation) {
    var stationName = targetTVStation[station];
    var programInfos = programList[stationName];
    for (var i = 0; i < programInfos.length; i++) {
      if (programInfos[i]["startTime"] <= now && programInfos[i]["endTime"] > now) {
        nowProgramLists[stationName] = programInfos[i];
      }
    }
  }
  return nowProgramLists;
};

// 現在時刻が番組表のメタデータの開始時刻と終了時刻の間にあるか否か
checkWithinProgramList = function(now) {
  console.log("log:(2)checkWithinProgramList");
  // programListのstartTime/endTimeの型と合わせるために、
  // yyyyMMddHHの数値に変換する
  var nowyyyyMMddHH = (now + "").substr(0, 10) - 0;
  // startTime+"00"からendTime+"59"までの番組表が存在するので、
  // 分情報を切り落としたnowyyyyMMddHHとの比較にはともに等号を入れる
  console.log("log:programList[startTime]:" + programList["startTime"]);
  console.log("log:programList[endTime]:" + programList["endTime"]);
  if (typeof programList["startTime"] === "undefined")  return false;
  if (typeof programList["endTime"] === "undefined")  return false;

  if (programList["startTime"] <= nowyyyyMMddHH && programList["endTime"] >= nowyyyyMMddHH) {
    return true;
  }
  return false;
};
