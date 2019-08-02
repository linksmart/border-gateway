const logger = require('../logger/log')("tracer", "debug");
const initTracer = require('jaeger-client').initTracer;
const opentracing = require('opentracing');
const PrometheusMetricsFactory = require('jaeger-client').PrometheusMetricsFactory;
const promClient = require('prom-client');

function jaegerTrace(localServiceName,enableDistributedTracing) {
    if(enableDistributedTracing) {

        let config = {
            serviceName: localServiceName,
            sampler: {
                type: "const",
                param: 1,
            },
            reporter: {
                // Provide the traces endpoint; this forces the client to connect directly to the Collector and send
                // spans over HTTP
                collectorEndpoint: 'http://jaeger:14268/api/traces',
                logSpans: true
                // Provide username and password if authentication is enabled in the Collector
                // username: '',
                // password: '',
            },
        };
        let namespace = config.serviceName.replace('-','_');
        let metrics = new PrometheusMetricsFactory(promClient, namespace);
        let options = {
            tags: {
                version: '1.1.2',
           },
           //metrics: metrics,
            logger: logger
        };
        let tracer = initTracer(config, options);
        return tracer;
    }
    else
    {
        const tracer = new opentracing.Tracer();
        return tracer;
    }

}
module.exports.jaegerTrace = jaegerTrace;


