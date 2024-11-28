const TokenValidator = require("twilio-flex-token-validator").functionValidator;

// optional private asset in services that can contain list of content templates to return
// expected format:
// { enabled: true/false, filters: { "ACxxx" : [HXxxx] }
const contentTemplateAsset = Runtime.getAssets()["/contentTemplateFilters.js"];
let contentTemplateFilters = undefined;
const setContentTemplateFilters = (contentTemplateAsset) => {
  if (!contentTemplateAsset?.path) return undefined;
  contentTemplateFilters = require(contentTemplateAsset.path);
  return contentTemplateFilters;
};

const filterTemplates = (templateSid, accountSid) => {
  // just read the asset once if it exists. it will be cached when running in twilio
  if (contentTemplateAsset && !contentTemplateFilters) {
    contentTemplateFilters = setContentTemplateFilters(contentTemplateAsset);
  }

  if (!contentTemplateFilters) return true;
  if (!contentTemplateFilters?.filters?.enabled) return true;
  if (!contentTemplateFilters?.filters?.accounts[accountSid]) return true;

  const allowedContentTemplates =
    contentTemplateFilters.filters.accounts[accountSid];

  return allowedContentTemplates.includes(templateSid);
};

exports.handler = TokenValidator(async function (context, event, callback) {
  const response = new Twilio.Response();

  response.appendHeader("Access-Control-Allow-Origin", "*");
  response.appendHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, OPTIONS, PUT, DELETE"
  );
  response.appendHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, Accept, X-Requested-With"
  );
  response.appendHeader("Access-Control-Max-Age", "3600");
  response.appendHeader("Content-Type", "application/json");

  if ((event.method || event.httpMethod || "").toUpperCase() === "OPTIONS") {
    response.setStatusCode(200);
    return callback(null, response);
  }

  try {
    const client = context.getTwilioClient();

    const templates = await client.content.v1.contents.list();

    const formattedTemplates = templates
      .filter((template) => filterTemplates(template.sid, context.ACCOUNT_SID))
      .map((template) => ({
        sid: template.sid,
        name: template.friendlyName,
      }));

    response.setStatusCode(200);
    response.setBody({ templates: formattedTemplates });

    return callback(null, response);
  } catch (error) {
    console.error("Error:", error);

    response.setStatusCode(500);
    response.setBody({
      error: true,
      message: error.message,
    });

    return callback(null, response);
  }
});
