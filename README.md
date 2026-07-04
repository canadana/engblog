# Load Path

A static blog for civil/transportation engineering writing — failure case studies and transportation analysis. Built as a static site generator: you write markdown files, GitHub automatically builds and publishes the HTML.

## How this works

You never write code and you never need to install anything. The flow is:

1. You add or edit a `.md` file in `content/posts/`.
2. You commit and push (or edit directly in the GitHub web interface).
3. GitHub Actions runs the build script and publishes the result to your live site, automatically, in about a minute.

## Publishing a new post

Create a new file in `content/posts/`, named `YYYY-MM-DD-short-slug.md`. Copy this structure:

```
---
title: "Your Post Title"
category: failure
date: 2026-04-01
location: "City, Country"
status: "Cause: identified"
excerpt: "One or two sentences. This shows in the post list and in link previews."
---

Write the post body here in plain markdown: `## Headings`, *italics*,
**bold**, [links](https://example.com), and `- bullet lists` all work.
```

Field reference:

| Field | Required | Notes |
|---|---|---|
| `title` | Yes | Shown as the page heading |
| `category` | Yes | Must be `failure`, `transportation`, or `notes` (see `content/site.json`) |
| `date` | Yes | Format `YYYY-MM-DD`. Controls sort order |
| `excerpt` | Recommended | Shown in post lists; skip and it's just blank there |
| `location` | Optional | Shown in the post's metadata block if present |
| `status` | Optional | Free text, e.g. "Cause: identified" / "Cause: disputed" / "Ongoing investigation" |

Read time and the URL slug are generated automatically — slug comes from the filename (the date prefix is stripped), or set `slug: your-slug` in the frontmatter to override it.

Delete the two example posts (`2026-03-01-tacoma-narrows.md`, `2026-02-10-induced-demand.md`) whenever you're ready — they're placeholders demonstrating the format.

## Changing site-wide settings

Edit `content/site.json`:

- `title` — the site name in the header (currently a placeholder: "Load Path")
- `tagline` — the line under the title
- `author` — used in the footer copyright line
- `categories` — add, remove, or recolor categories here. Each needs a `label` and a hex `color`, which controls that category's tag color throughout the site.

## Changing the About page

Edit `content/about.md` directly — it's plain markdown with a title in the frontmatter.

## One-time setup: getting this live

1. Create a free GitHub account if you don't have one, and create a new repository (public or private both work).
2. Upload this entire project folder to that repository. Easiest path with no command line: on the repo page, use "Add file → Upload files," drag in everything except the `node_modules` folder (not needed — GitHub installs dependencies itself).
3. In the repository, go to **Settings → Pages**, and under "Build and deployment," set **Source** to **GitHub Actions**.
4. Push any change (or just wait — the initial upload triggers it) and check the **Actions** tab. Once the workflow finishes, your site is live at `https://your-username.github.io/your-repo-name/`.
5. Come back to `content/site.json` and set `baseUrl` to that exact URL (no trailing slash) — this is only used for the RSS feed and sitemap links, so it's not urgent, but do it before you care about either.

After that, every future post is: add the markdown file, commit, push. No further setup.

## Previewing changes before publishing (optional)

If you ever want to see a post before pushing it, and you're comfortable installing [Node.js](https://nodejs.org): run `npm install` once, then `node build.js` any time, then open `docs/index.html` in a browser. Not required — you can just push and let GitHub build it, and check the live site or the Actions log.

## Project structure

```
content/
  site.json        ← site title, tagline, categories/colors
  about.md         ← About page content
  posts/*.md       ← every blog post
public/
  css/style.css    ← all visual styling
build.js           ← the generator (you shouldn't need to touch this)
docs/              ← generated output (not stored in git; GitHub Actions builds it fresh each time)
.github/workflows/deploy.yml   ← the automation that builds + publishes on every push
```
