const winston = require('winston');

function myFormat(prettyPrintJson) {
    let myFormat;

    if (prettyPrintJson) {
        myFormat = winston.format.printf(({timestamp, label, level, message, metadata}) => {
            return `${timestamp} [${label}] ${level}: ${message} ${JSON.stringify(metadata, null, 4)}`;
        });
    }
    else
    {
        myFormat = winston.format.printf(({timestamp, label, level, message, metadata}) => {
            return `${timestamp} [${label}] ${level}: ${message} ${JSON.stringify(metadata)}`;
        });
    }
    return myFormat;
}


function logger(serviceName, logLevel, prettyPrintJson) {
    return logger = winston.createLogger({
        level: logLevel || 'info',
        format: winston.format.combine(
            winston.format.label({label: serviceName}),
            winston.format.timestamp(),
            //winston.format.prettyPrint(),
            winston.format.metadata({fillExcept: ['message', 'level', 'timestamp', 'label']}),
            myFormat(prettyPrintJson)
        ),
        transports: [
            new winston.transports.Console()
        ]
    });
}

module.exports = logger;