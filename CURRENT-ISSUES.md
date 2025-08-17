# Current Issues

- [ ] On dev, and probably also on prod, a nested HTML document is being rendered inside the main one, duplicating the
      content. This might be related to some issue in the entry files or root.tsx or router.ts
- [ ] The website shows "Error: Vite module runner has been closed." on dev mode whenever we change the vite config
      file.
- [ ] If we want Vite to generate CSS files, we need to import the styles in the entry-client.tsx file. Doing that in
      other files doesn't work.
- [ ] `public/` folder contents are copied to the `dist/ssr/` folder, instead of the `dist/client/` folder.
- [ ] `public/` assets are not being served on dev. E.g. `/favicon.ico` is not being served.
- [ ] Browser errors when serving the build: GET /app/styles.css net::ERR_ABORTED 404 (Not Found), GET
      /app/entry-client.tsx net::ERR_ABORTED 404 (Not Found)
- [ ] No styles when serving the build.
