exports.handler = async function (context, event, callback) {
    const response = new Twilio.Response();
    
    response.appendHeader('Access-Control-Allow-Origin', '*');
    response.appendHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
    response.appendHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, X-Requested-With');
    response.appendHeader('Access-Control-Max-Age', '3600');
    response.appendHeader('Content-Type', 'application/json');

    if ((event.method || event.httpMethod || '').toUpperCase() === 'OPTIONS') {
        response.setStatusCode(200);
        return callback(null, response);
    }

    try {
        const client = context.getTwilioClient();
        
        const templates = await client.content.v1.contents.list();

        const formattedTemplates = templates.map((template) => ({
            sid: template.sid,
            name: template.friendlyName,
        }));

        response.setStatusCode(200);
        response.setBody({ templates: formattedTemplates });
        
        return callback(null, response);
    } catch (error) {
        console.error('Error:', error);
        
        response.setStatusCode(500);
        response.setBody({ 
            error: true, 
            message: error.message 
        });
        
        return callback(null, response);
    }
};