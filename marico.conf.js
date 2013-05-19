module.exports = {
  socketio: {
    port: 3000,
    setInterval: 60000, // 番組表を更新する間隔 [ms]
  },
  remoconLists: [
    // resourceファイル名から.jsonを除いたものとする
    // 例：resource/tv.json -> "tv"
    "tv",
    "appletv",
  ],
  targetTVStation: {
    // key: msnのサイトでの番組名
    // value: view/index.ejsでの番組名
    "NHK": "nhk",
    "NHK Ｅテレ": "etv",
    "チバテレビ": "chiba",
    "日本テレビ": "ntv",
    "テレビ朝日": "asahi",
    "TBS": "tbs",
    "テレビ東京": "tokyo",
    "フジテレビ": "fuji",
    "TOKYO MX": "mx",
  },
  hidDevice:  {
    // raspberry piでdmesg | grep hidと入力して、
    // hiddevとhidrawの両方が確認できるデバイス
    // http://a-desk.jp/modules/forum_hobby/index.php?topic_id=44
    device1: "\/dev\/hidraw3",
  }
};
