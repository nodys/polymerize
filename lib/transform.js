var through    = require('through')
var extend     = require('extend')
var polymerize = require('./polymerize')

module.exports = transform;

/**
 * Browserify's transform function for polymerize
 * @param  {String} filepath
 * @param  {Object} [options]
 * @return {Stream}
 */
function transform(filepath, options) {

  // Normalize options
  options = extend({
    match: /bower_components.*\.html$/
  }, options || {})

  if(!(options.match instanceof RegExp)) {
    options.match  = RegExp.apply(null, Array.isArray(options.match) ? options.match : [options.match])
  }

  // Shim polymer.js
  if(/polymer\/polymer\.js$/.test(filepath)) {
    return shimPolymer();
  }

  // Transform only source that vulcanize can handle
  if(!options.match.test(filepath) || !/\.html$/.test(filepath)) {
    return through();
  }

  // Bufferize and polymerize
  var src = '';
  return through(
    function(chunk) { src += chunk.toString() },
    function() {
      this.queue(polymerize(src, filepath, options))
      this.queue(null)
    }
  );
}

/**
 * A browserify transform to shim polymer's vulcanized source
 *
 * Some parts of polymer does not support well commonJS conventions
 * and need a fix to expose some globals on window.
 */
function shimPolymer() {
  var src = '';
  return through(
    function(chunk) { src += chunk.toString() },
    function() {
      this.queue(src
        .replace(/\w+\.(PolymerExpressions|esprima)(\s*=)/g, 'window.$1$2')
      )
      this.queue(null)
    }
  )
}
