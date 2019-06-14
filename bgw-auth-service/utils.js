function targetPathFromHttpPayload(payload) {
    if (!payload.includes("HTTP") || payload.includes("#") || payload.includes("+")) {
        return undefined;
    }
    let targetPath = "";
    let splitPayload = payload.split("/");

    let arrayLength = splitPayload.length;

    if (arrayLength < 4) {
        return undefined;
    }

    for (let i = 0; i < arrayLength; i++) {
        if (i === 0) {
            //protocol
            targetPath += (splitPayload[i].toLowerCase() + "://");
        }
        //skip http method
        else if (i === 2) {
            //domain
            targetPath += (splitPayload[i] + ":");
        } else if (i === 3) {
            //port
            targetPath += splitPayload[i];
        } else if (i >= 4) {
            //path
            targetPath += ("/" + splitPayload[i]);
        }
    }
    return targetPath;
}

module.exports.targetPathFromHttpPayload = targetPathFromHttpPayload;

