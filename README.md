# victory-docs-link-crawler

## Set up

- Install the dependencies (just cheerio for now):

```shell
npm ci
```

## Invocation

- Accepts the following parameters: `original url` `new url` `[vercel.json path]`

Example:

```shell
node crawl-links.js https://victory-rose.vercel.app/open-source/victory/docs http://localhost:3001/open-source/victory/docs ../vercel.json
```
