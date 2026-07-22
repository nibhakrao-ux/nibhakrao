# Adding a new batch of photos

You don't need to touch `index.html` to add new photos to the site. Just:

1. **Create a new folder here** in `images/`, named however you like
   (e.g. `2026-fall-shoot`, `paris-trip`, `lone-tree-show`). Folder names
   are just for your own organization — they don't have to match a
   category.

2. **Upload your photos** into that folder.

3. **Create a `manifest.json`** inside that same folder describing each
   photo. It's a list like this:

   ```json
   [
     {
       "file": "IMG_001.jpg",
       "title": "Sunset Ridge",
       "category": "landscape",
       "year": 2026
     },
     {
       "file": "IMG_002.jpg",
       "title": "Corner Cafe",
       "category": "food",
       "year": 2026
     }
   ]
   ```

   - `file` — the image's filename, exactly as uploaded (case-sensitive).
   - `title` — shown as the photo's caption on the site.
   - `category` — must be one of `objects`, `landscape`, or `food`. This
     is what drives the filter tabs, so it needs to be exactly one of
     those three words, lowercase.
   - `year` — shown in the caption alongside the category.

4. **Add your folder's name to `images/collections.json`** — this is the
   one file at the top level that tells the site which folders to look
   in. It's just a list of folder names:

   ```json
   ["2026-fall-shoot"]
   ```

   If you're adding a second batch later, add its name to the same list:

   ```json
   ["2026-fall-shoot", "paris-trip"]
   ```

That's it — no other files need to change. If a manifest has a typo or a
folder is missing from `collections.json`, that one batch just won't show
up; it won't break the rest of the site.

## Existing (legacy) photos

The original set of photos uploaded before this system existed still
lives directly in the repo root (not in a subfolder) and is listed
directly in `index.html`. They don't need a manifest — this only applies
to new batches going forward.
