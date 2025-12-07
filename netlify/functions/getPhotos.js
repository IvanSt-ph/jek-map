// netlify/functions/getPhotos.js

const REPO = "IvanSt-ph/jek-map";
const FILE_PATH = "photos.json";

exports.handler = async () => {
  try {
    const token = process.env.GITHUB_TOKEN;
    if (!token) {
      return {
        statusCode: 500,
        body: "Missing GITHUB_TOKEN env var"
      };
    }

    const api = `https://api.github.com/repos/${REPO}/contents/${FILE_PATH}`;

    const headers = {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28"
    };

    const res = await fetch(api, { headers });

    if (res.status === 404) {
      // файла нет — возвращаем пустой объект
      return {
        statusCode: 200,
        body: JSON.stringify({})
      };
    }

    if (!res.ok) {
      const text = await res.text();
      return {
        statusCode: res.status,
        body: `GitHub GET error: ${text}`
      };
    }

    const data = await res.json();

    const content = data.content
      ? Buffer.from(data.content, "base64").toString("utf8")
      : "{}";

    let json;
    try {
      json = JSON.parse(content || "{}");
    } catch {
      json = {};
    }

    return {
      statusCode: 200,
      body: JSON.stringify(json)
    };

  } catch (e) {
    return {
      statusCode: 500,
      body: `Server error: ${e.message}`
    };
  }
};
