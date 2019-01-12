/*jshint node:true, esversion: 6, laxcomma:true */

const opencensus = require("@opencensus/core");
const stackdriver = require("@opencensus/exporter-stackdriver");
const prometheus = require("@opencensus/exporter-prometheus");

var OpenCensus = (function() {
    
    // Properties
    // -- logger
    // -- exporters
    // -- stats
    // -- counters -- map of counter names
    
    // Constructor
    function OpenCensus(config, events, logger) {

        this.logger = logger;
        this.logger.log(`[OpenCensus:cons] Entered`);

        // Initialize exporters
        this.exporters = {};
        
        // OpenCensus
        // Stackdriver
        this.logger.log(`[Opencensus:cons] Creating Stackdriver Exporter`);
        if (config.opencensus.stackdriver.projectId === "undefined") {
            this.logger.log(`Require GCP Project ID`);
            // Unable to proceed
            return false;
        }
        this.logger.log(`[Opencensus:cons] GCP Project ID: ${config.opencensus.stackdriver.projectId}`);
        this.exporters.stackdriver = new stackdriver.StackdriverStatsExporter({
            projectId: config.opencensus.stackdriver.projectId
        });

        // Prometheus
        this.logger.log(`[Opencensus:cons] Creating Prometheus Exporter`);
        if (config.opencensus.prometheus === "undefined") {
            //TODO(dazwilkin) What if there's no prometheus config?
        }
        this.exporters.prometheus = new prometheus.PrometheusStatsExporter({
            port: ((port) => port !== "undefined" ? port : 9464)(config.opencensus.prometheus.port),
            startServer: true
        });

        // Register Exporter(s)
        this.stats = new opencensus.Stats();
        for (let exporterName in this.exporters) {
            this.logger.log(`[Opencensus:cons] Registering ${exporterName}`);
            this.stats.registerExporter(this.exporters[exporterName]);
        }

        // For Prometheus
        // this.exporters.prometheus.startServer(function callback() {});

        // Initialize maps
        this.counters = {};
        this.gauges = {};
        this.timers = {};

        // attach
        this.logger.log(`Registering 'flush' with statsd server`);
        events.on('flush', (time_stamp,metrics) => this.flush(time_stamp,metrics));
        this.logger.log(`Registering 'status' with statsd server`);
        events.on('status', (write) => this.status(write));

        this.logger.log(`[OpenCensus:cons] Exited`);
        return true;
    }

    // Private functions
    let clean = (key) => key.split(".").join("_");

    // Public functions
    OpenCensus.prototype.flush = function(time_stamp,metrics) {

        let logPrefix = "[Opencensus:flush]";
        this.logger.log(`${logPrefix} Entered`);
        this.logger.log(`${logPrefix} ${new Date(time_stamp * 1000).toString()}`);

        // Counters
        for (let key in metrics.counters) {
            let measure, value;
            value = metrics.counters[key];
            this.logger.log(`${logPrefix} Counter: ${key}: ${value}`);
            // Check measure's existence
            if (!this.counters.hasOwnProperty(key)) {
                // Counter is new, create it
                this.logger.log(`${logPrefix} Creating counter: ${clean(key)}`);
                measure = this.stats.createMeasureInt64(
                    clean(key),
                    opencensus.MeasureUnit.UNIT,
                    "none provided"
                );
                // Cache it
                this.counters[key] = measure;
                // Without a view, measurements are discarded
                this.logger.log(`${logPrefix} Creating view: ${clean(key)}`);
                const labels = ["status"];
                let view = this.stats.createView(
                    clean(key),
                    measure,
                    opencensus.AggregationType.COUNT,
                    labels,
                    "none provided"
                );
                this.stats.registerView(view);
            } else {
                // Retrieve the cached measure
                measure = this.counters[key];
            }
            const tags = {status: "OK"};
            try {
                this.logger.log(`${logPrefix} Recording: ${clean(key)}=${value}`);
                this.stats.record({
                    measure:measure,
                    tags,
                    value:value
                });
            } catch (err) {
                this.logger.log(`${logPrefix} stats.record error: ${err}`);
                tags.status="ERROR";
                tags.error=err.message;
            }

        }

        // Gauges
        for (let key in metrics.gauges) {
            let measure, value;
            value = metrics.gauges[key];
            this.logger.log(`${logPrefix} Gauge: ${key}: ${metrics.gauges[key]}`);
            // Check gauge's existence
            if (!this.gauges.hasOwnProperty(key)) {
                // Gauge is new, create it
                this.logger.log(`${logPrefix} Creating gauge: ${clean(key)}`);
                measure = this.stats.createMeasureDouble(
                    clean(key),
                    opencensus.MeasureUnit.UNIT,
                    "none provided"
                );
                // Cache it
                this.gauges[key] = measure;
                // Without a view, measurements are discarded
                this.logger.log(`${logPrefix} Creating view: ${clean(key)}`);
                const labels = ["status"];
                let view = this.stats.createView(
                    clean(key),
                    measure,
                    opencensus.AggregationType.SUM,
                    labels,
                    "none provided"
                );
                this.stats.registerView(view);
            } else {
                // Retrieve the cached measure
                measure = this.gauges[key];
            }
            const tags = {status: "OK"};
            try {
                this.logger.log(`${logPrefix} Recording: ${clean(key)}=${value}`);
                this.stats.record({
                    measure:measure,
                    tags,
                    value:value
                });
            } catch (err) {
                this.logger.log(`${logPrefix} stats.record error: ${err}`);
                tags.status="ERROR";
                tags.error=err.message;
            }
        }

        // Timers
        for (let key in metrics.timers) {
            this.logger.log(`Timer: ${key}: ${metrics.timers[key]}`);
        }

        this.logger.log(`${logPrefix} Exited`);
    };
    OpenCensus.prototype.status = function(write) {
        this.logger.log(`[OpenCensus:status] Entered`);
        // Test
        // f(error, backend_name, stat_name, stat_value)
        write(null, "opencensus", "stat-name", 0);
        this.logger.log(`[OpenCensus:status] Exited`);
    };

    return OpenCensus;
}());

exports.init = (startup_time, config, events, logger) => new OpenCensus(config, events, logger);