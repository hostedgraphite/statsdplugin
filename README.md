# Hosted Graphite statsd plugin

This is a plugin for [etsy's statsd](https://github.com/etsy/statsd) that sends your metric data to the [Hosted Graphite](http://www.hostedgraphite.com) service.

## Installation

Place **hostedgraphite.js** into the **backends/** directory of your **statsd** install.

## Configuration

### Enabling the plugin

Add './backends/hostedgraphite' to the ```backends``` list.

```
	backends: ['./backends/hostedgraphite']
```

### Setting the Hosted Graphite key

Set ```hostedGraphiteAPIKey``` to your key. This looks like a UUID and is available from your account details page on [hostedgraphite.com](hostedgraphite.com)

```
	hostedGraphiteAPIKey: 'deadbeef-dead-beef-dead-beefdeadbeef'
```

## Example configuration

```
{
      port: 8125
   ,  backends: ['./backends/hostedgraphite']
   ,  hostedGraphiteAPIKey: 'deadbeef-dead-beef-dead-beefdeadbeef'
}
```