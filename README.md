# <span style="color:red">Basically working!!</span>


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


Test it by publishing a counter:
```
echo "foo:1|c" | nc -u -w0 127.0.0.1 8125
```

Observe counters created in Stackdriver either through the console or APIs Explorer (more to come)

