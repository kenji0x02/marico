#!/bin/sh

# -- USB接続赤外線リモコンの動作確認 --

# 起動コマンド
# sudo sh ./test-transmit-code.sh
# 注意：リモコンへコードを書き込むにはsudo権限が必要

# raspberry piでdmesg | grep hidと入力して、
# hiddevとhidrawの両方が確認できるデバイス
# http://a-desk.jp/modules/forum_hobby/index.php?topic_id=44
hidDevice=/dev/hidraw3

# リモコン固有の送信を2バイト毎に分割したコード
# (例: 8240bf12ed0000)
code="\x82\x40\xbf\x12\xed"

sudo /usr/bin/printf "\x60${code}" > ${hidDevice}
