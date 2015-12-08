var RedisEvent = require('../index.js');
var fake = require('fakeredis');
var options = {
	redis: {
		createClientFactory: function(){
			return fake.createClient(6379, '127.0.0.1',{
				enable_offline_queue: false,
				retry_max_delay: 10000,
				max_attempts: 10000,
				no_ready_check: true
			});
		}
	}
};

var assert = require('chai').assert;

describe("Options#", function() {
	it("should require channels list option", function() {
		assert.throw(function() {
			new RedisEvent();
		});
	});

	it("should require channels list option to be set", function() {
		assert.throw(function() {
			new RedisEvent(options);
		});
	});
	
	it("should require channels list option to be an array", function() {
		assert.throw(function() {
			new RedisEvent(null,options);
		});
	});
});