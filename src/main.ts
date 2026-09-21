import { Octokit } from "octokit";
import { type RestEndpointMethodTypes } from "@octokit/plugin-rest-endpoint-methods";
import { stringify, type XmlElement, type XmlNode } from "@std/xml";

type Releases = RestEndpointMethodTypes["repos"]["listReleases"]["response"]["data"];

function firefox(releases: Releases): string {
  return JSON.stringify({
    addons: {
      "anubis-bypass@andre4ik3.dev": {
        updates: releases.map((release) => ({
          version: release.name,
          update_link: release.assets.find((asset) => asset.name === "extension.xpi")?.browser_download_url,
          update_hash: release.assets.find((asset) => asset.name === "extension.xpi")?.digest,
        })),
      },
    },
  });
}

function el(name: string, attributes: Record<string, string> = {}, children: XmlNode[] = []): XmlElement {
  return {
    type: "element",
    name: { raw: name, local: name },
    attributes,
    children,
  };
}

function chromium(releases: Releases): string {
  return stringify({
    declaration: {
      type: "declaration",
      encoding: "UTF-8",
      version: "1.0",
    },
    root: el(
      "gupdate",
      {
        xmlns: "http://www.google.com/update2/response",
        protocol: "2.0",
      },
      [
        el(
          "app",
          { appid: "hbocpnemmimnkcddekhpiogjigmjnemb" },
          [el("updatecheck", {
            codebase: releases[0].assets.find((asset) => asset.name === "extension.crx")?.browser_download_url,
            version: releases[0].name,
          })],
        ),
      ],
    ),
  });
}

async function handleRequest(request: Request): Promise<Response> {
  if (request.method !== "GET" || request.headers.has("Upgrade")) {
    return Response.json("error: only GET is allowed", { status: 405 });
  }

  const url = new URL(request.url);
  const api = new Octokit();
  const headers = {
    "Cache-Control": "public, max-age=300, stale-while-revalidate=3600",
  };

  if (url.pathname === "/updates.xml") {
    const releases = await api.rest.repos.listReleases({
      owner: "andre4ik3",
      repo: "anubis-bypass",
    });
    return new Response(chromium(releases.data), { headers });
  } else if (url.pathname === "/updates.json") {
    const releases = await api.rest.repos.listReleases({
      owner: "andre4ik3",
      repo: "anubis-bypass",
    });
    return new Response(firefox(releases.data), { headers });
  } else {
    return Response.json("not found", { status: 404 });
  }
}

export default {
  fetch: handleRequest,
};
