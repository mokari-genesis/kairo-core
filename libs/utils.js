const response = async (code, data, msg, mysqlConn = null) => {
  if (mysqlConn) {
    await mysqlConn.end()
  }

  return {
    statusCode: code,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Credentials": true,
    },
    body: JSON.stringify(
      {
        data,
        msg: msg || "OK",
        status: code >= 200 && code < 300 ? "SUCCESS" : "FAILURE",
      },
      null,
      2
    ),
  };
};

const getBody = (event) => {
  try {
    return event.body
      ? typeof event.body === "string"
        ? JSON.parse(event.body)
        : event.body
      : JSON.parse(event.Records[0].Sns.Message);
  } catch (e) {
    return {};
  }
};

const normalizeKeysToLowercase = (input) => {
  input = input || {};
  return Object.entries(input).reduce(
    (acc, [key, value]) => ({ ...acc, [key.toLowerCase()]: value }),
    {}
  );
};

const getData = (token) =>
  JSON.parse(
    decodeURIComponent(
      Buffer.from(token.replace(/-/g, '+').replace(/_/g, '/'), 'base64')
        .toString()
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    )
  )

const getUserEmailFromAuthorization = (token) =>
  token ? getData(token.split('.')[1]).email.toLowerCase() : ''

module.exports = {
  response,
  getBody,
  normalizeKeysToLowercase,
  getUserEmailFromAuthorization,
};

