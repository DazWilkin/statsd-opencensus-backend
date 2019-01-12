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
        this.logger.log(`[OpenCensus:cons] entered`);

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
        this.logger.log(`Attaching 'flush'`);
        events.on('flush', (time_stamp,metrics) => this.flush(time_stamp,metrics));
        this.logger.log(`Attaching 'status'`);
        events.on('status', (write) => this.status(write));

        return true;
    }

    let clean = (key) => key.split(".").join("_");

    // Method
    OpenCensus.prototype.x = function() {
        this.logger.log("Hello");
    };

    OpenCensus.prototype.flush = function(time_stamp,metrics) {

        this.logger.log(`[OpenCensus:flush] entered`);
        this.logger.log(`Flushing stats at ${new Date(time_stamp * 1000).toString()}`);

        for (let key in metrics.counters) {
            let measure, value;
            value = metrics.counters[key];
            this.logger.log(`Counter: ${key}: ${value}`);
            // Check measure's existence
            if (!this.counters.hasOwnProperty(key)) {
                // Counter is new, create it
                this.logger.log(`[Opencensus:flush] Creating counter: ${clean(key)}`);
                measure = this.stats.createMeasureInt64(
                    clean(key),
                    opencensus.MeasureUnit.UNIT,
                    "None provided"
                );
                // Cache it
                this.counters[key] = measure;
                // Without a view, measurements are discarded
                this.logger.log(`[Opencensus:flush] Creating view: ${clean(key)}`);
                const labels = ["status"];
                let view = this.stats.createView(
                    clean(key),
                    measure,
                    opencensus.AggregationType.COUNT,
                    labels,
                    "None provided"
                );
                this.stats.registerView(view);
            } else {
                // Retrieve the cached measure
                measure = this.counters[key];
            }
            const tags = {status: "OK"};
            this.stats.record({
                measure:measure,
                tags,
                value:value
            });

        }

        for (let key in metrics.gauges) {
            let measure, value;
            value = metrics.gauges[key];
            this.logger.log(`Gauge: ${key}: ${metrics.gauges[key]}`);
            // Check gauge's existence
            if (!this.gauges.hasOwnProperty(key)) {
                // Gauge is new, create it
                this.logger.log(`[Opencensus:flush] Creating gauge: ${clean(key)}`);
                measure = this.stats.createMeasureDouble(
                    clean(key),
                    opencensus.MeasureUnit.UNIT,
                    "None provided"
                );
                // Cache it
                this.gauges[key] = measure;
                // Without a view, measurements are discarded
                this.logger.log(`[Opencensus:flush] Creating view: ${clean(key)}`);
                const labels = ["status"];
                let view = this.stats.createView(
                    clean(key),
                    measure,
                    opencensus.AggregationType.SUM,
                    labels,
                    "None provided"
                );
                this.stats.registerView(view);
            } else {
                // Retrieve the cached measure
                measure = this.gauges[key];
            }
            const tags = {status: "OK"};
            this.stats.record({
                measure:measure,
                tags,
                value:value
            });
        }

        for (let key in metrics.timers) {
            this.logger.log(`Timer: ${key}: ${metrics.timers[key]}`);
        }

    };
    OpenCensus.prototype.status = function(write) {
        this.logger.log(`[OpenCensus:status] entered`);
        // Test
        // f(error, backend_name, stat_name, stat_value)
        write(null, "opencensus", "stat-name", 0);
    };

    return OpenCensus;
}());

exports.init = (startup_time, config, events, logger) => new OpenCensus(config, events, logger);