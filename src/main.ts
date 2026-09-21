import { Octokit } from "octokit";
import { stringify, type XmlElement, type XmlNode } from "@std/xml";

const api = new Octokit();

const releases = await api.rest.repos.listReleases({ owner: "andre4ik3", repo: "anubis-bypass" });

function firefoxUpdates(): string {
  return JSON.stringify({
    addons: {
      "anubis-bypass@andre4ik3.dev": {
        updates: releases.data.map(release => ({
          version: release.name,
          update_link: release.assets.find(asset => asset.name === "extension.xpi")?.browser_download_url,
          update_hash: release.assets.find(asset => asset.name === "extension.xpi")?.digest,
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

function chromeUpdates(): string {
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
            codebase: releases.data[0].assets.find(asset => asset.name === "extension.crx")?.browser_download_url,
            version: releases.data[0].name,
          })],
        ),
      ],
    ),
  });
}

async function handleRequest(request: Request): Promise<Response> {
  if (request.method !== "GET") return Response.json("error: only GET is allowed", { status: 405 });
  const url = new URL(request.url);

  if (url.pathname === "/updates.json") return new Response(firefoxUpdates());
  else if (url.pathname === "/updates.xml") return new Response(chromeUpdates());
  else return Response.json("not found", { status: 404 });
}

export default {
  fetch: handleRequest,
};
