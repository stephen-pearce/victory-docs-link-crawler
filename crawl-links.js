const cheerio = require("cheerio");
const { readFileSync } = require("fs");
const { argv } = require("node:process");
const { parse } = require("node:url");

const filterLinks = (links, url, siteUrl) => {
  const { pathname } = url;
  const { origin, pathname: basePath } = siteUrl;

  return links
    .map((href) =>
      href.startsWith("#") ? `${pathname}${href}` : href.replace(origin, "")
    )
    .filter(
      (href, index, self) =>
        href.startsWith(basePath) &&
        href !== basePath &&
        self.indexOf(href) === index
    );
};

const extractLinks = async (url, visited, broken, siteUrl) => {
  const currentUrl = new URL(url);
  const { origin, pathname, hash } = currentUrl;
  const hashUrl = `${pathname}${hash}`;

  if (visited.has(pathname)) {
    if (hash) visited.add(hashUrl);
    return;
  }
  if (broken.has(pathname)) return;

  console.log(`crawling ${url}`);

  let $;
  try {
    $ = await cheerio.fromURL(url);
    visited.add(pathname);
    if (hash) visited.add(hashUrl);
  } catch {
    broken.add(pathname);
    return;
  }

  const { links } = $.extract({
    links: [
      {
        selector: "a",
        value: "href",
      },
    ],
  });

  const newLinks = filterLinks(links, currentUrl, siteUrl);
  for (const link of newLinks) {
    await extractLinks(`${origin}${link}`, visited, broken, siteUrl);
  }
};

const crawl = async (url) => {
  const links = new Set();
  const broken = new Set();
  await extractLinks(url, links, broken, new URL(url));

  return { links, broken };
};

const parseRedirects = (configPath) => {
  try {
    const configFile = readFileSync(configPath, "utf8");
    const config = JSON.parse(configFile);

    return (config?.redirects || []).reduce(
      (redirects, redirect) => [
        ...redirects,
        redirect.source,
        parse(redirect.destination).pathname,
      ],
      []
    );
  } catch (e) {
    console.error(`Error reading redirects from ${configPath}: ${e.message}`);
    return [];
  }
};

const diff = async (originalSite, newSite, redirects) => {
  const { links: originalLinks } = await crawl(originalSite);
  const { links: newLinks, broken } = await crawl(newSite);

  const missing = new Set(originalLinks);
  for (const link of [...newLinks, ...redirects]) {
    missing.delete(link);
  }

  if (!missing.size && !broken.size) {
    console.log("\nNo missing/broken links found");
  } else {
    console.log("\nMissing/broken links:");
    [...missing, ...broken].forEach((link) => console.log(link));
  }
};

const args = argv.slice(2);
if (args.length < 2) {
  console.log(`
    usage: crawl-links.js <original url> <new url> [vercel.json path]

    example: crawl-links.js https://victory-rose.vercel.app/open-source/victory/docs http://localhost:3001/open-source/victory/docs ../vercel.json
    `);
  process.exitCode = 1;
  return;
}
const [originalSite, newSite, configPath] = args;
const redirects = configPath ? parseRedirects(configPath) : [];

diff(originalSite, newSite, redirects);
