var assert = require('assert');
var request = require('supertest'); 

process.env.AWSREGION = 'ap-southeast-2';

describe('Input Routes - ', function() {
    it('Simple Insert', function () {
        var inData = require('../backend/AWSInData');
        var token = "278ger1zhztyvs556w1a";
        var res = null;

        assert.equal(token, inData.insertData(token, "34", res));
    })

    it('Bad Token Insert', function() {
        assert.ok(1 === 1, "This shouldn't fail");
        assert.ok(false, "This should fail");
    })
})
