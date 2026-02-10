# Fractured Research

A personal website for publishing and viewing research articles created with AI.

## Overview

Fractured Research is a lightweight, static website — no frameworks, no build step, no trackers. Just HTML, CSS, and vanilla JavaScript with a scholarly, typographically-driven design.

## Features

- **Article Listing** — Browse all articles with search and filtering
- **Article Reader** — Clean, distraction-free reading experience with full Markdown rendering
- **Compose** — Write and publish new articles with Markdown support
- **Local Storage** — Articles persist in your browser's local storage
- **Responsive** — Works on desktop, tablet, and mobile

## Getting Started

Open `index.html` in a browser, or serve it locally:

```bash
npx serve . -p 3000
```

## Project Structure

```
├── index.html          # Single-page application shell
├── css/
│   └── style.css       # Design system and all styles
├── js/
│   ├── app.js          # Main application logic (navigation, rendering)
│   ├── articles.js     # Article data, storage management, sample articles
│   └── markdown.js     # Lightweight Markdown parser
└── articles/           # Reserved for future static article files
```
