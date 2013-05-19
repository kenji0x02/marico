
/*
 * GET home page.
 */

exports.index = function(req, res){
  res.render('index', { title: 'TV' });
};
exports.index2 = function(req, res){
  res.render('appletv', { title: 'Apple TV' });
};
