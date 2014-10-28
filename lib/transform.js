var through    = require('through')
var whacko    = require('whacko')
var read       = require('fs').readFileSync;
var resolve    = require('resolve').sync
var dirname    = require('path').dirname
var extname    = require('path').extname
var extend     = require('extend')
var relative   = require('path').relative
var polymerize = require('./polymerize')

module.exports =  function(filepath, options) {

  options = extend({
    match: /.*/
  }, options || {})

  if(!(options.match instanceof RegExp)) {
    options.match  = RegExp.apply(null, Array.isArray(options.match) ? options.match : [options.match])
  }

  if(extname(filepath) != '.html') {
    return through();
  }

  if(!options.match.test(filepath)) {
    return through();
  }

  console.log('polymerize', filepath)

  var src = '';
  return through(
    function(chunk) { src += chunk.toString() },
    function() {
      var self            = this;
      var $               = whacko.load(src);
      var polymerElements = $('polymer-element');
      if(!polymerElements.length) {
        self.queue(src)
        self.queue(null)
      } else {
        console.log('OK polymer (%s)', filepath)
        self.queue(polymerize(src, filepath, options))
        self.queue(null)
      }
    }
  );
}
