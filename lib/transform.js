var through    = require('through')
var whacko     = require('whacko')
var read       = require('fs').readFileSync;
var resolve    = require('resolve').sync
var dirname    = require('path').dirname
var extname    = require('path').extname
var extend     = require('extend')
var relative   = require('path').relative
var polymerize = require('./polymerize')

module.exports =  function(filepath, options) {

  options = extend({
    match: /bower_components.*\.html$/
  }, options || {})

  if(/polymer\/polymer\.js$/.test(filepath)) {
    var src = '';
    return through(
      function(chunk) { src += chunk.toString() },
      function() {
        this.queue(src
          .replace(/\w+\.(PolymerExpressions|esprima)(\s*=)/g, 'window.$1$2')
        )
        this.queue(null)
      }
    );
  }

  if(!(options.match instanceof RegExp)) {
    options.match  = RegExp.apply(null, Array.isArray(options.match) ? options.match : [options.match])
  }

  if(!options.match.test(filepath)) {
    return through();
  }

  if(!/\.html$/.test(filepath)) {
    return through();
  }

  console.time('polym-' + filepath)

  var src = '';
  return through(
    function(chunk) { src += chunk.toString() },
    function() {
      this.queue(polymerize(src, filepath, options))
  console.timeEnd('polym-' + filepath)
      this.queue(null)
    }
  );
}
