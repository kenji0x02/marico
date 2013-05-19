$.fn.marquee = function ( opts ){
    var defaults = {
        marquee  : $(':first', this)
        , easing : 'linear'
        , speed  : 3000
        , startPosition: 100
        , endPosition: 100
        , verocityPerPixel: 40 // 1ピクセル当たりの表示時間
        , callbackLeft: 0
        , callbackText: ""
    },
    settings = $.extend(defaults, opts);
    var startPosition = defaults.startPosition;

    var mq = defaults.marquee;

    // スタート時の位置の指定とmarquee用に属性の変更
    mq.css({
        'left'          : startPosition
        , 'top': '36px'// margin-topと合わせる
        , 'position'    : 'absolute'
        , 'white-space' : 'nowrap'
        , 'display'     : 'block'
    });

    var endPosition = defaults.endPosition;
    var easing = defaults.easing;
    var speed  = defaults.speed;

    var streamTime = defaults.verocityPerPixel * (startPosition + endPosition);

    var animate = function(){
        mq.animate({
            left : '-' + endPosition + 'px'
        }, streamTime, easing , function(){
          // callbackで再帰的に動かす
          mq.css({'left': defaults.callbackLeft});
          mq.text(defaults.callbackText);
          // animate();
        });
    };
    animate();
};

