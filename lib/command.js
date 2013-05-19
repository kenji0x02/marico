// 赤外線リモコンにコマンドを送信する
// 変数の意味は以下
// action: 操作名称(例: power)
// signal: リモコン固有の送信信号(例: 8240BF12ED0000)
// code: 赤外線リモコンが実際に送信する命令(例: x60\x82\x40\xBF\x12\xED\x00\x00)

var fs = require('fs');
// 外部コマンド実行用
var exec = require('child_process').exec;

const HEX_SIMBOL = "\\x";
// Bit Trade One赤外線リモコンの送信指定コード
const TRANSMIT_START_SIGN = HEX_SIMBOL + "60";

var codes = {};

readFileSetCode = function(fileName) {
  fs.readFile(fileName, 'utf8', function (err, data) {
    // エラーの場合はログをはくだけ
    if(err) console.error("Error: File is not exists:" + fileName);

    var json = JSON.parse(data);
    var name = json["name"];
    var signals = json["signals"];

    // 2次元ハッシュとして登録
    codes[name] = {};

    for (var action in signals) {
      var code = createCode(signals[action]);
      codes[name][action] = code;
    }
  });
};

module.exports.setCodes = function(remoconLists) {
  for (var i = 0; i < remoconLists.length; i++) {
    var fileName = __dirname + '/../resource/' + remoconLists[i] + '.json';
    readFileSetCode(fileName);
  }
};

// 信号からcodeを生成
createCode = function(signal) {
  // 16進数を2文字のセグメントに分割
  var segments = signal.match(/.{2}/g);
  var code = TRANSMIT_START_SIGN;
  for (var i = 0; i < segments.length; i++) {
    code += HEX_SIMBOL + segments[i];
  }
  return code;
};

// codeとデバイス名からコマンド作成
createCommand = function(code, device){
  return "\/usr\/bin\/printf " + '"' + code + '" > ' + device;
};

// 外部コマンド実行
transmitExec = function(cmd) {
  return exec(cmd, function(error, stdout, stderr) {
    // console.log('stdout: ' + (stdout || 'none'));
    console.log('stderr: ' + (stderr || 'none'));
    if(error !== null) {
      console.log('exec error: '+error);
    }
  })
};

module.exports.transmit = function(remoconName, action, hidDevice) {
  var requestCode = codes[remoconName][action];
  var command = createCommand(requestCode, hidDevice);
  console.log("command:" + command);
  transmitExec(command);
};
