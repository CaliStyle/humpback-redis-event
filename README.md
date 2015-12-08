humpback-redis-event
====================

Distributed node.js event emitter based on redis pub/sub.

Supports channels (sort of namespaces). This code is heavily used 24x7 on a thousand-servers cluster.

While this iteration of redis-event was built for [Humpback](https://github.com/CaliStyle/humpback) it
is a good candiate for any server clusters who need to speak to eachother.

# SYNOPSIS

```javascript
var RedisEvent = require('redis-event');

var options = {
  prefix: 'sync',
  redis: {
    port: 1234,
    host: '10.0.50.20',
    auth: 'password',
    db: 3, // if provided select a non-default redis db
    options: {
    	// see https://github.com/mranney/node_redis#rediscreateclient
     	enable_offline_queue: false, 
     	retry_max_delay: 10000, 
     	max_attempts: 10000, 
     	no_ready_check: true
    }
  }
}

//Connect to localhost redis
var ev = new RedisEvent(['updates', 'stats']);

ev.on('ready', function() {
	ev.on('updates:server', function(data) {
		console.log("Host %s updated to %d", data.hostname, data.count);
	});

	ev.pub('updates:test', {
		launchedAt: new Date()
	});

	ev.pub('stats:date', {
		now: new Date()
	});

	ev.on('updates:shutdown', function(data) {
		ev.quit();
	});
});
```

## Connections

You can pass a redis connection to humpback-redis-event, or by default it will try to connect to a redis connection on localhost port 6379.

`prefix` controls the key names used in Redis.  By default, there is no prefix. Prefix generally shouldn't be changed unless you need to use one Redis instance for multiple apps. It can also be useful for providing an isolated testbed across your main application.

```js
var options = {
  prefix: 'sync',
  redis: {
    port: 1234,
    host: '10.0.50.20',
    auth: 'password',
    db: 3, // if provided select a non-default redis db
    options: {
    	// see https://github.com/mranney/node_redis#rediscreateclient
     	enable_offline_queue: false, 
     	retry_max_delay: 10000, 
     	max_attempts: 10000, 
     	no_ready_check: true
    }
  }
}
```

var ev = new RedisEvent(
	['updates', 'stats'],
	options
);

You can also specify the connection information as a URL string.

```js
var ev = new RedisEvent({
  redis: 'redis://example.com:1234?redis_option=value&redis_option=value'
});
```

Below is a sample code to enable [redis-sentinel](https://github.com/ortoo/node-redis-sentinel) to connect to [Redis Sentinel](http://redis.io/topics/sentinel) for automatic master/slave failover.

```js
var Sentinel = require('redis-sentinel');
var endpoints = [
  {host: '192.168.1.10', port: 6379},
  {host: '192.168.1.11', port: 6379}
];
var opts = options || {}; // Standard node_redis client options
var masterName = 'mymaster';
var sentinel = Sentinel.Sentinel(endpoints);

var ev =  new RedisEvent(['updates', 'stats'],{
		redis: {
			createClientFactory: function(){
				return sentinel.createClient(masterName, opts);
			}
		}
});
```

## Installation

```
npm install humpback-redis-event
```

## API

### new RedisEvent([channel, channel, channel...], options)

Initialise object.

__Arguments__

* `channel` - name(s) of the redis pub/sub channel(s) to subscribe to
* `options` - optional object that may have following properties:
  * `redis` - redis connection to connect to.
    * `connectionFactory` = redis connection factory

### redisEvent.subscribe(channelName)

Subscribe to Channel.

__Arguments__

* `channelName` - channel name;

### redisEvent.unsubscribe(channelName)

Unsubscribe to Channel.

__Arguments__

* `channelName` - channel name;

### redisEvent.pub(eventName, payload)

Emit network event.

__Arguments__

* `eventName` - event name in form of `channel:name`, eg. `server:stats`
* `payload` - optional JS object to add to the event. Must be serializable to JSON

### redisEvent.on(eventName, function(payload))

Subscribe to network event. Special case: `ready` event (see below).

__Arguments__

* `eventName` - event name in form of `channel:name`, eg. `server:stats`
* `payload` - optional JS object that was added to event

### redisEvent.on('ready')

This event is emitted when humpback-redis-event has successfully connected to both redis sub and pub channels. You will want to emit events only after this event is fired. If also can be fired multiple times in case there was a reconnect.

### redisEvent.quit()

Disconnect from redis. This is actually useful to quit node application.

