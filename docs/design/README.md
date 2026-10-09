# TPR design reference

Design files for the Transition Pathways Repository, kept next to the code they describe. Nothing in this folder is part of the website: it is never built, deployed, or shown to users.

| File                                               | What it is                                                                                                                                                      |
| -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`tpr-design-tokens.json`](tpr-design-tokens.json) | Every brand color, plus type sizes, weights, corner radius, and shadows, in a format Figma can import (via the Tokens Studio plugin).                           |
| [`tpr-ui-kit.html`](tpr-ui-kit.html)               | A visual reference page showing every reusable interface component: badges, buttons, cards, tables, and so on, each labeled with the code names developers use. |

## Opening the UI kit

GitHub shows HTML files as code rather than as a page. To view it:

1. Open [`tpr-ui-kit.html`](tpr-ui-kit.html) on GitHub.
2. Click the **Download raw file** button (the downward arrow, top right of the file).
3. Double-click the downloaded file. It opens in your browser.

The page's last section, **Using this in Figma**, walks through importing the colors and components.

## For the designer: what stays up to date by itself, and what doesn't

### ✅ Automatic: the colors in `tpr-design-tokens.json`

The colors in this file are copied straight from the app's code by a script, never typed by hand. Every proposed code change is checked automatically on GitHub: if a developer changes a color and this file no longer matches, the change is blocked until they update it.

**What this means for you:** the colors in this file always match the app's code on the same branch. You can trust it without double-checking. This folder currently lives on the `epic/v2` branch, so it reflects the v2 redesign rather than the version users see today.

**What it doesn't do:** it doesn't update Figma. When colors change, re-import this file into Tokens Studio to pick up the new values. Checking this file's history on GitHub (the **History** button) shows you when it last changed.

### ✋ Manual: everything else

These parts are maintained by hand, so they can fall behind the code. When the app's look changes, someone needs to update them.

| What                                                              | Why it's manual                                                                                                                     | When to update it                                                                                                                                         |
| ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **The UI kit page** (`tpr-ui-kit.html`)                           | It's a hand-drawn picture of the components, not the components themselves. No script can redraw it.                                | When a change adds, removes, or restyles a component. Ask the developer making the change to update the kit in the same pull request, or flag it for you. |
| **Type sizes, weights, corner radius, shadows** in the token file | These are standard defaults that the app's code doesn't define, so there's nothing for the script to copy from. They rarely change. | Only if the team deliberately changes them, for example by adopting a brand typeface.                                                                     |
| **The "Last checked" line below**                                 | It records when someone last compared the UI kit against the real app.                                                              | Every time the UI kit is updated.                                                                                                                         |
| **Your Figma file**                                               | Figma lives outside this repository.                                                                                                | After any change to either file here.                                                                                                                     |

**Last checked:** October 2026, against the v2 redesign in [RMI/tpr#937](https://github.com/RMI/tpr/pull/937).

> **Note on v2:** items in the UI kit tagged **v2** come from #937, the v2 redesign on the `epic/v2` branch, which had not been merged into `main` when this was written. Once it merges, remove the "not yet live" note at the top of the UI kit and update the line above.

## For developers

- **Changed a color in `src/index.css`?** Run `npm run tokens:build` and commit the updated `docs/design/tpr-design-tokens.json`. CI fails until you do.
- **Changed how a component looks?** Update `tpr-ui-kit.html` to match (or tell the designer), and update the **Last checked** line above.
