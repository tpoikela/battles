
var chai = require("chai");
var expect = chai.expect;

var Obj = require("../src/object.js");

var TypedObj = Obj.Typed;

describe('TypedObject', function() {
    it('description', function() {
        var obj = new TypedObj("actors", "xxx");
        expect(obj.getPropType()).to.equal("actors");
    });
});
