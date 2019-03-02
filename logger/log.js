const winston = require('winston');

const myFormat = winston.format.printf(({ timestamp, label, level, message, metadata }) => {
    return `${timestamp} [${label}] ${level}: ${message} ${JSON.stringify(metadata)}`;
});

function logger(serviceName, logLevel)
{
    return logger = winston.createLogger({
        level: logLevel || 'info',
        format: winston.format.combine(
            winston.format.label({ label: serviceName }),
            winston.format.timestamp(),
            //winston.format.prettyPrint(),
            winston.format.metadata({ fillExcept: ['message', 'level', 'timestamp', 'label'] }),
            myFormat
        ),
        transports: [
            new winston.transports.Console()
        ]
    });
}

module.exports=logger;