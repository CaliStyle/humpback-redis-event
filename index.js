var
	util = require('util'),
	events = require('events'),
	redis = require('redis');

function RedisEvent(channelsList, options) {
	events.EventEmitter.call(this);

	var self = this;

	self._connectedCount = 0;

	options = options || {};

	if( typeof options.redis === 'string' ) {
	    // parse the url
	    var conn_info = url.parse(options.redis, true /* parse query string */);
	    if( conn_info.protocol !== 'redis:' ) {
	      throw new Error('redis-event connection string must use the redis: protocol');
	    }

	    options.redis = {
			port: conn_info.port || 6379,
	    	host: conn_info.hostname,
	    	// see https://github.com/mranney/node_redis#rediscreateclient
	    	options: conn_info.query || { enable_offline_queue: false, retry_max_delay: 10000, max_attempts: 10000, no_ready_check: true}
	    };

	    if( conn_info.auth ) {
	      options.redis.auth = conn_info.auth.replace(/.*?:/, '');
	    }
	}

	options.redis = options.redis || {};

	if (!channelsList || !(channelsList instanceof Array) || channelsList.length < 0) {
		throw new Error("No channels specified to RedisEvent");
	}
	this.channelsList = channelsList;

	var pubClientFactoryMethod = options.redis.createClientFactory || self.createClientFactory;
    var pubClient = pubClientFactoryMethod(options);

    if(options.prefix){
	    pubClient.prefix = options.prefix;
	    // redefine getKey to use the configured prefix
	    pubClient.getKey = function( key ) {
	      return this.prefix + ':' + key;
	    };
	}

	this.pubRedis = pubClient;

	this.pubRedis.on('error', function(e){ console.log(e); });

	this.pubRedis.on('ready', function() {
		self._connectedCount++;
		if (self._connectedCount == 2) {
			self.emit('ready');
		}
	});

	this.pubRedis.on('end', function() {self._connectedCount--; });


	var subClientFactoryMethod = options.redis.createClientFactory || self.createClientFactory;
    var subClient = subClientFactoryMethod(options);

    if(options.prefix){
	    subClient.prefix = options.prefix;
	    // redefine getKey to use the configured prefix
	    subClient.getKey = function( key ) {
	      return this.prefix + ':' + key;
	    };
	}

	this.subRedis = subClient;

	this.subRedis.on('error', function(e){ console.log(e); });

	this.subRedis.on('ready', function() {
		self._connectedCount++;
	
		self.channelsList.forEach(function(channelName) {
			self.subscribe(channelName);
		});

		if (self._connectedCount == 2) {
			self.emit('ready');
		}
	});

	this.subRedis.on('end', function() {self._connectedCount--; });

	this.subRedis.on("message", this._onMessage.bind(this));
}
util.inherits(RedisEvent, events.EventEmitter);

RedisEvent.prototype.subscribe = function(channelName) {
	this.subRedis.subscribe(channelName);
};

RedisEvent.prototype.unsubscribe = function(channelName) {
	this.subRedis.unsubscribe(channelName);
};

RedisEvent.prototype._onMessage = function(channel, message) {
	var data = null, eventName = null;
	try {
		data = JSON.parse(message);
		if (data && data.event) {
			eventName = channel + ':' +data.event;
		}
	} catch(e) {
	
	}

	if (data && eventName) {
		this.emit(eventName, data.payload);
	}
};

RedisEvent.prototype.pub = function(eventName, payload) {
	var split = eventName.split(':');
	if (split.length!=2) {
		console.log("ev warning: eventName '%s' is incorrect", eventName);
		return false;
	}

	var data = {
		event: split[1],
		payload: payload
	};

	this.pubRedis.publish(split[0], JSON.stringify(data), function(){});
};

RedisEvent.prototype.quit = function() {
	this.subRedis.quit();
	this.pubRedis.quit();
};

RedisEvent.prototype.createClientFactory = function( options ) {
  var socket = options.redis.socket;
  var port   = !socket ? (options.redis.port || 6379) : null;
  var host   = !socket ? (options.redis.host || '127.0.0.1') : null;
  var client = redis.createClient(socket || port, host, options.redis.options || { enable_offline_queue: false, retry_max_delay: 10000, max_attempts: 10000, no_ready_check: true });
  if( options.redis.auth ) {
    client.auth(options.redis.auth);
  }
  if( options.redis.db ) {
    client.select(options.redis.db);
  }
  return client;
}

module.exports = RedisEvent;
