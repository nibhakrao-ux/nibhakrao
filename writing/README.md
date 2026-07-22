# Adding a new essay

Everything lives in `writing/essays.json` — no other files to touch. It's a
list of essay objects:

```json
[
  {
    "title": "What the Light Skips Over",
    "genre": "Personal Essay",
    "date": "2026",
    "excerpt": "A short teaser (1-2 sentences) shown on the card in the Writing section.",
    "body": [
      "First paragraph of the essay.",
      "Second paragraph.",
      "And so on — each string in this list becomes one paragraph."
    ],
    "photoTitle": "Praying Hands"
  }
]
```

- `title` — the essay's title.
- `genre` — shown as a small label above the title, e.g. `"Personal Essay"`,
  `"Reflection"`, `"Short Fiction"`.
- `date` — optional. Shown next to the genre.
- `excerpt` — a short teaser shown on the card before someone clicks in.
- `body` — the full essay, broken into paragraphs. Each entry in this list
  becomes one `<p>` when the essay opens.
- `photoTitle` — optional. If it exactly matches the `title` of an existing
  photo (see the `photos` list in `index.html`, or a future
  `images/<batch>/manifest.json` entry), that photo is shown at the top of
  the essay when it's opened — useful for ekphrastic pieces written about a
  specific photo.

Adding a new essay is just appending a new object to the list. If
`essays.json` has a typo or fails to parse, the Writing section simply
renders empty rather than breaking the rest of the site.
