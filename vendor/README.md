# vendor

`anthropic-sdk.js` is the official Anthropic TypeScript/JavaScript SDK (`@anthropic-ai/sdk` 1.7.0, Apache-2.0, see `LICENSE-anthropic-sdk`)
bundled into one browser ES module, so the static site needs no build step and works offline:

```bash
npm install @anthropic-ai/sdk@1.7.0 esbuild
printf "export { default } from '@anthropic-ai/sdk';\nexport * from '@anthropic-ai/sdk';\n" > entry.mjs
npx esbuild entry.mjs --bundle --format=esm --platform=browser --target=es2020 --minify --legal-comments=eof --outfile=anthropic-sdk.js
```

It is only loaded when a correction is requested.
