const {targetPathFromHttpPayload} = require('../bgw-auth-service/utils.js');
var assert = require('assert');

// Tests are hierarchical. Here we define a test suite for our calculator.
describe('bgw-auth-service util tests', function() {
    // And then we describe our testcases.
    it('targetPathFromHttpPayload translates payload into address correctly', function(done) {
        assert.equal(targetPathFromHttpPayload('HTTPS/GET/demo.linksmart.eu/443/GET/sc'), 'https://demo.linksmart.eu:443/GET/sc');
        done();
    });
});