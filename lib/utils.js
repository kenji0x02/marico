// よく使う関数

// 全角→半角変換
// 全角英数の文字コードから65248(=0xFEE0)個前が半角英数の文字コード
// http://kazunori-lab.com/uchikikase/?p=955
String.prototype.toOneByteAlphaNumeric = function() {
  return this.replace(/[Ａ-Ｚａ-ｚ０-９]/g, function(s) {
    return String.fromCharCode(s.charCodeAt(0) - 0xFEE0);
  });
};

// 全角スペース→半角スペース変換
String.prototype.toOneByteSpace = function() {
  return this.replace(/　/g," ");
};

// 時間をyyyyMMddHHmmに変換
// javascriptにはstrftimeがない、、、
Date.prototype.yyyyMMddHHmm= function() {
  var fullYear = this.getFullYear() + "";
  var month = (this.getMonth() + 1) + "";
  var date = this.getDate() + "";
  var hours = this.getHours() + "";
  var minutes = this.getMinutes() + "";
  if (month.length == 1) month = "0" + month;
  if (date.length == 1) date = "0" + date;
  if (hours.length == 1) hours = "0" + hours;
  if (minutes.length == 1) minutes = "0" + minutes;
  return fullYear + month + date + hours + minutes;
};
