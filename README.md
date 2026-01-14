# Aria

A simple astro framework blog theme

## Post frontmatter

```yaml
title: ""
description: ""
pubDate: "2026-01-01 00:00:00"
updatedDate: "2026-01-01 00:00:00"
draft: false
encrypt: false
password: ""
question: ""
slug: ""
```

## TODO List / Pipeline

- [ ] STATIC Landing Page: `index.astro`
  - [ ] Centered title
    - [ ] Typing effect using `typed.js`
    - [ ] Show hover hint after 10s
    - [ ] Hide title and show entry on hover
  - [ ] Entry: redirect to `/archive`
- [ ] STATIC Archive Page: `archive/index.astro`
  - [ ] Year/month selector on the top
  - [ ] Use first showing post as the anchor
  - [ ] Year/month/date on the left
  - [ ] Infinite scroll for post list
  - [ ] Footer
  - [ ] Floating weather plugin
- [ ] STATIC Pagination Chunks `archive/[page].astro`
  - [ ] Pagination
  - [ ] Styled titles
  - [ ] Date as attribute
- [ ] STATIC 404 Page: `404.astro`
  - [ ] Use http.cat for image
  - [ ] Footer
- [ ] STATIC Unprotected Post Page: `posts/[...static].astro`
  - [ ] Shared post layout
  - [ ] Title
  - [ ] Frontmatter
  - [x] Content block
  - [ ] Footer
  - [ ] Weather widget
- [ ] DYNAMIC Protected Post Page: `post/[...dynamic].astro`
  - [x] Check JWT before `render()`
  - [x] Redirect to `/api/gatekeeper` if not valid
  - [ ] Run `render()` and return content
    - [ ] Shared post layout
    - [ ] Title
    - [ ] Frontmatter
    - [x] Content block
    - [ ] Footer
    - [ ] Weather widget
- [x] DYNAMIC API Endpoint `api/gatekeeper.astro`
  - [x] `GET`: Receive param `slug` in url and render a password entry page according to `slug`
    - [x] Question
    - [x] Formdata
      - [x] Password input
      - [x] Cloudflare Turnstile
  - [x] `POST`: Receive jsonbody as `{slug, password, turnstile}` and verify password
    - [x] Check turnstile response
    - [x] Get hashed value from kv according to `slug`
    - [x] Construct request to vercel api
      - [x] Body: `{hash, password}`
      - [x] Header: special header
      - [x] Sign request with HMAC
    - [x] Send request and receive response
    - [x] Check HMAC validity for response
    - [x] Sign a JWT token on success
    - [x] Redirect back to post
