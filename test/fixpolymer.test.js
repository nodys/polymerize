/* jshint undef: false, unused: false */

var fixpolymer = (process.env.COVERAGE ? require('../lib-cov/fixpolymer.js') : require('../lib/fixpolymer.js'));
var expect     = require('expect.js');
var join       = require('path').join;
var concat     = require('concat-stream')
var resumer    = require('resumer')


function fixp(filename) {
  return join(__dirname, '/fixtures', filename);
}

describe('fixpolymer', function(){

  it('should return a stream', function() {
    expect(fixpolymer).to.be.a('function')
    expect(fixpolymer()).to.have.property('pipe')
    expect(fixpolymer().pipe).to.be.a('function')
  })

  it('should patch polymer source', function(done) {
    resumer().queue('a.PolymerExpressions = r; b.esprima = p; c.esprima(); c.foobar = q;').end()
      .pipe(fixpolymer())
      .pipe(concat(function(result) {
        expect(result)
          .to.eql('window.PolymerExpressions = r; window.esprima = p; c.esprima(); c.foobar = q;')
        done();
      }))
  })
})
