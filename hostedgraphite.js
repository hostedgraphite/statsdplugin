/*
 * Flush stats to hostedgraphite (http://www.hostedgraphite.com).
 *
 * To enable this backend, include './backends/hostedgraphite' in the backends
 * configuration array:
 *
 *   backends: ['./backends/hostedgraphite']
 *
 * This backend supports the following config options:
 *
 *   hostedGraphiteAPIKey: A hostedgraphite.com API key. (a UUID)
 */

var net = require('net'),
   util = require('util'),
   http = require('http');

var debug;
var flushInterval;
var APIKey;

var graphiteStats = {};

var post_stats = function graphite_post_stats(statString) {
  var options = {
    host: 'www.hostedgraphite.com',
    port: 80,
    path: '/api/v1/sink',
    method: 'POST',
    auth: APIKey,
    headers: {'Content-Length': statString.length}
  };
  
  var req = http.request(options, function(res) {
    if (res.statusCode == 202) {
       graphiteStats.last_flush = Math.round(new Date().getTime() / 1000);
    }
  });
  
  req.on('error', function(ex) {
    graphiteStats.last_exception = Math.round(new Date().getTime() / 1000);
    if (debug) {
      util.log(ex);
    }
  });
  
  req.write(statString);
  req.end();
}

var flush_stats = function graphite_flush(ts, metrics) {
  var statString = '';
  var numStats = 0;
  var key;

  var counters = metrics.counters;
  var gauges = metrics.gauges;
  var timers = metrics.timers;
  var pctThreshold = metrics.pctThreshold;

  for (key in counters) {
    var value = counters[key];
    var valuePerSecond = value / (flushInterval / 1000); // calculate "per second" rate

    statString += 'stats.'        + key + ' ' + valuePerSecond + ' ' + ts + "\n";
    statString += 'stats_counts.' + key + ' ' + value          + ' ' + ts + "\n";

    numStats += 1;
  }

  for (key in timers) {
    if (timers[key].length > 0) {
      var values = timers[key].sort(function (a,b) { return a-b; });
      var count = values.length;
      var min = values[0];
      var max = values[count - 1];

      var cumulativeValues = [min];
      for (var i = 1; i < count; i++) {
          cumulativeValues.push(values[i] + cumulativeValues[i-1]);
      }

      var sum = min;
      var mean = min;
      var maxAtThreshold = max;

      var message = "";

      var key2;

      for (key2 in pctThreshold) {
        var pct = pctThreshold[key2];
        if (count > 1) {
          var thresholdIndex = Math.round(((100 - pct) / 100) * count);
          var numInThreshold = count - thresholdIndex;

          maxAtThreshold = values[numInThreshold - 1];
          sum = cumulativeValues[numInThreshold - 1];
          mean = sum / numInThreshold;
        }

        var clean_pct = '' + pct;
        clean_pct.replace('.', '_');
        message += 'stats.timers.' + key + '.mean_'  + clean_pct + ' ' + mean           + ' ' + ts + "\n";
        message += 'stats.timers.' + key + '.upper_' + clean_pct + ' ' + maxAtThreshold + ' ' + ts + "\n";
        message += 'stats.timers.' + key + '.sum_' + clean_pct + ' ' + sum + ' ' + ts + "\n";
      }

      sum = cumulativeValues[count-1];
      mean = sum / count;

      message += 'stats.timers.' + key + '.upper ' + max   + ' ' + ts + "\n";
      message += 'stats.timers.' + key + '.lower ' + min   + ' ' + ts + "\n";
      message += 'stats.timers.' + key + '.count ' + count + ' ' + ts + "\n";
      message += 'stats.timers.' + key + '.sum ' + sum  + ' ' + ts + "\n";
      message += 'stats.timers.' + key + '.mean ' + mean + ' ' + ts + "\n";
      statString += message;

      numStats += 1;
    }
  }

  for (key in gauges) {
    statString += 'stats.gauges.' + key + ' ' + gauges[key] + ' ' + ts + "\n";
    numStats += 1;
  }

  statString += 'statsd.numStats ' + numStats + ' ' + ts + "\n";
  post_stats(statString);
};

var backend_status = function graphite_status(writeCb) {
  for (stat in graphiteStats) {
    writeCb(null, 'hostedgraphite', stat, graphiteStats[stat]);
  }
};

exports.init = function graphite_init(startup_time, config, events) {
  debug = config.debug;
  APIKey = config.hostedGraphiteAPIKey;

  graphiteStats.last_flush = startup_time;
  graphiteStats.last_exception = startup_time;

  flushInterval = config.flushInterval;

  events.on('flush', flush_stats);
  events.on('status', backend_status);

  return true;
};
