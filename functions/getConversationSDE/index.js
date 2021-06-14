async function lambda(input, callback) {
    function checkInput(input) {
        if(input.payload && input.payload.conversationId && input.payload.sdes && Array.isArray(input.payload.sdes) && input.payload.sdes.length > 0) {
            for(const sde of input.payload.sdes) {
                if(typeof sde === 'string' || sde instanceof String)
                    continue;
                else
                    return false;
            }
            return true;
        }

        return false;
    }

    function processSDEs(sdes) {
        var result = {
            sdes: new Map(),
            unAuthSdes: new Map()
        };
        sdes.sdes.events.forEach(element => {
            var tmp = Object.keys(element);
            tmp.forEach(name => {
                if((name !== 'serverTimeStamp') && (name !== 'sdeType'))
                    result.sdes.set(name,element[name][name]);
            });
        });

        sdes.unAuthSdes.events.forEach(element => {
            var tmp = Object.keys(element);
            tmp.forEach(name => {
                if((name !== 'serverTimeStamp') && (name !== 'sdeType'))
                    result.unAuthSdes.set(name,element[name][name]);
            });
        });
        return result;
    }

    if(!checkInput(input))
        return callback(new Error('Wrong arguments given to this function'), null);

    // import FaaS Toolbelt
    const { Toolbelt, ConversationContentTypes } = require("lp-faas-toolbelt");

    // Create SDE/Conversation-Util instance
    const conversationUtil = Toolbelt.ConversationUtil();
    const sdeUtil = Toolbelt.SDEUtil();

    // Define parameters
    const contentToRetrieve = [
        ConversationContentTypes.SDES,
        ConversationContentTypes.UNAUTH_SDES
    ];

    try {
        const conversation = await conversationUtil.getConversationById(input.payload.conversationId, contentToRetrieve);
        const sdes = processSDEs(sdeUtil.getSDEsFromConv(conversation));
        const output = [];

        input.payload.sdes.forEach(sdeRaw => {
            const sde = sdeRaw.split(":");
            if(sde.length == 2 && sdes.sdes.get(sde[0]))
                output.push(sdes.sdes.get(sde[0])[sde[1]]);
            else if(sde.length == 3 && sdes[sde[0]] && sdes[sde[0]].get(sde[1]))
                output.push(sdes[sde[0]].get(sde[1])[sde[2]]);
            else
                output.push("");
        });

        return callback(null,output);
    } catch (error) {
        console.error(`Received ${error.message} during obtaining SDE's for ${input}`);
        callback(error, null);
    }
}