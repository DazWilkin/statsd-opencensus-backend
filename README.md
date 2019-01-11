# <span style="color:red">Doesn't work!!</span>


Clone 
- [etsy/statsd](https://github.com/etsy/statsd)
- [statsd-opencensus-backend](https://github.com/DazWilkin/statsd-opencensus-backend/blob/master/README.md)

Create GCP Project (`[[YOUR-PROJECT]]`)

Enable Stackdriver

Create service account w/ Stackdriver permissions (`roles/monitoring.metricWriter`) and download the key


From within the etsy statsd directory:

```bash
EXPORT GOOGLE_APPLICATION_CREDENTIALS = ${PWD}/key.json
````

config.js
```json
{
    flushInterval: 5000,
    backends: [
        "[[PATH-TO]]/statsd-opencensus-backend"
    ],
    opencensus:{
        stackdriver: {
            projectId: [[YOUR-PROJECT]]
        }
    }
}
```

Then run it:
```bash
node stats.js /path/to/yourConfig.js

```