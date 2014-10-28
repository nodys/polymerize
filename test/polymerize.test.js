/* jshint undef: false, unused: false */

var polymerize = (process.env.COVERAGE ? require('../lib-cov/polymerize.js') : require('../lib/polymerize.js'));
var expect = require('expect.js');
var join   = require('path').join;


function fixp(filename) {
  return join(__dirname, '/fixtures', filename);
}

describe('polymerize', function(){
  it('should be tested ...')
})
