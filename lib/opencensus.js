/*jshint node:true, esversion: 6, laxcomma:true */

const opencensus = require("@opencensus/core");
const stackdriver = require("@opencensus/exporter-stackdriver");

var OpenCensus = (function() {
    
    // Properties
    // -- logger
    // -- exporter
    // -- stats
    // -- counters -- map of counter names
    
    // Constructor
    function OpenCensus(config, events, logger) {

        this.logger = logger;
        this.logger.log(`[OpenCensus:cons] entered`);

        // OpenCensus
        if (config.opencensus.stackdriver.projectId === "undefined") {
            this.logger.log(`Require GCP Project ID`);
            // Unable to proceed
            return false;
        }
        this.exporter = new stackdriver.StackdriverStatsExporter({
            projectId: config.opencensus.stackdriver.projectId
        });

        // Register Exporter
        this.stats = new opencensus.Stats();
        this.stats.registerExporter(this.exporter);

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

    // Method
    OpenCensus.prototype.x = function() {
        this.logger.log("Hello");
    };

    OpenCensus.prototype.flush = function(time_stamp,metrics) {

        this.logger.log(`[OpenCensus:flush] entered`);
        this.logger.log(`Flushing stats at ${new Date(time_stamp * 1000).toString()}`);

        for (let key in metrics.counters) {
            let measure;
            let value = metrics.counters[key];
            this.logger.log(`Counter: ${key}: ${value}`);
            // Check measurements existence
            if (!this.counters.hasOwnProperty(key)) {
                // Counter is new, create it
                // Remove periods from name
                cleanKey = key.split(".").join("_");
                this.logger.log(`[Opencensus:flush] counter: ${key} --> ${cleanKey}`);
                measure = this.stats.createMeasureInt64(
                    name = cleanKey,
                    unit = opencensus.MeasureUnit.UNIT,
                    description = "None provided"
                );
                this.counters[key]=measure;
                // Without a view, measurements are discarded
                const labels = ["status"];
                let view = this.stats.createView(
                    name = key.replace(".","_"),
                    measure = measure,
                    aggregation = opencensus.AggregationType.COUNT,
                    tagKeys = labels,
                    description = "None provided"
                );
                this.stats.registerView(view);
            }
            const tags = {status: "OK"};
            this.stats.record({
                measure:measure,
                tags,
                value:value
            });

        }
        for (let key in metrics.gauges) {
            this.logger.log(`Gauge: ${key}: ${metrics.gauges[key]}`);
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

exports.init = (startup_time, config, events, logger) => new OpenCensus(config, events, logger)