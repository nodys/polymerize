var through = require('through')

/**
 * A browserify transform to shim polymer's vulcanized source
 *
 * Some parts of polymer does not support well commonJS conventions
 * and need a fix to expose some globals on window.
 */
module.exports = function () {
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
