const {Tracer, ExplicitContext, ConsoleRecorder, BatchRecorder} = require('zipkin');
const { HttpLogger } = require('zipkin-transport-http');

const ctxImpl = new ExplicitContext();
const batchRecorder = new BatchRecorder({
    logger: new HttpLogger({
        endpoint: `http://zipkin:9411/api/v1/spans`
    })
});

const consoleRecorder = new ConsoleRecorder((message)=>{});

function trace(localServiceName,enableDistributedTracing) {
    if(enableDistributedTracing) {
        return new Tracer({recorder: batchRecorder, ctxImpl: ctxImpl, localServiceName: localServiceName});
    }
    else
    {
        return new Tracer({recorder: consoleRecorder, ctxImpl: ctxImpl, localServiceName: localServiceName});
    }
}

module.exports = trace;