# UI guidelines

These rules are generated from this system's design choices (direction **calm**,
palette **Ocean**); they hold for every screen. Tokens are referred to by name; their values
live in `tokens.css`.

## Colour

- Every colour is a semantic token: surfaces (`--color-bg`, `--color-surface`,
  `--color-surface-subtle`), text (`--color-fg`, `--color-fg-muted`, `--color-fg-faint`), the brand
  (`--color-primary`, with `--color-on-primary` on it), borders and the status roles. A literal
  colour in a screen breaks dark mode, which swaps only the tokens.
- Status is a role, never a hue: success, warning, danger and info each come as a strong colour, a
  text colour and a soft fill (`--color-danger`, `--color-danger-text`, `--color-danger-soft`).
  Status text goes on its own soft fill, the pairing that is contrast-checked.
- Light and dark are both supported: `tokens.css` follows the system setting and
  `[data-theme="light"]` / `[data-theme="dark"]` pin one. Test a screen in both.
- Charts use `--color-viz-1` to `--color-viz-6` in order, with `--color-on-viz-n` for a label on a
  series; a sixth series is the limit, beyond it group the rest as "Other".

## Typography

- Headings use Inter, body copy Inter, code and ids JetBrains Mono (`--font-family-heading`,
  `--font-family-body`, `--font-family-mono`). The fonts are vendored under `fonts/`; until the
  files are added the declared fallback stack renders.
- Sizes come from the eight-step scale `--font-size-xs` to `--font-size-4xl`: page titles
  `--font-size-3xl`, section headings `--font-size-2xl` or `--font-size-xl`, body `--font-size-md`,
  captions `--font-size-sm`. Skip no more than one step between a title and the text under it.
- Weights are `--font-weight-regular` for text, `--font-weight-medium` for labels and
  `--font-weight-heading` for headings; line height is `--line-height-normal` for text and
  `--line-height-tight` for headings.

## Icons

The icon set is **Outline** (Lucide-style, round caps. The default), drawn at 20px with a 2px stroke: sizes come from `--icon-size-sm`, `--icon-size-md` and `--icon-size-lg`, never a literal.

- Draw an icon with `<svg class="icon"><use href="#i-name"/></svg>` from the sprite in `icons.svg`; it takes the colour of the text around it, so an icon is never given a colour of its own.
- The starter glyphs are `home`, `kanban`, `check`, `cal`, `user`, `users`, `bell`, `search`, `sliders`, `plus`, `filter`, `flag`, `clock`, `tag`, `msg`, `trash`. A screen that needs another asks for a design-system change; it does not draw one-off icons or use emoji.
- An icon-only control (`.btn-icon`) carries an `aria-label` and a tooltip, and only a conventional glyph (search, plus, close, settings) stands without a visible label.
- A decorative icon next to text is `aria-hidden`; a status is never shown by an icon alone, it is paired with text or a `.badge`.
- Licence: Glyph geometry authored for bnts-arc. Style follows Lucide (ISC); no Lucide paths are copied.

## Layout kit

- The shell is **sidebar app shell** (left navigation, header, content); `app-shell.html` is the
  frame and a screen designs only the content inside it. A screen never restyles the shell.
- A screen picks one page template from `layout-templates.html` (this system's default is
  **dashboard grid**: stat cards over a main chart and a side panel), chooses its columns and states, and stays inside
  it. A needed new template is a design-system change, reviewed once.
- Widths and rhythm come from tokens: `.container` follows `--container-sm` to `--container-xl`,
  the page edge is `--page-gutter`, vertical sections sit `--section-gap` apart and related items
  `--density-gap`. Content never grows past `--container-xl`.
- Spacing uses `--space-1` to `--space-10` only. Breakpoints are `--breakpoint-sm` to
  `--breakpoint-xl` (documented values: a media query cannot read a custom property); the shell
  collapses its navigation below 820px behind a menu button.
- Compose pages from the page kit (`.page`, `.page-header`, `.toolbar`, `.page-body`) and the
  layout helpers (`.stack`, `.cluster`, `.grid`, `.split`); do not write a screen's own flex or
  grid rules where one of these does the job.

## Density

- The density is **comfortable** (36 px controls, 44 px rows): controls take `--control-height-md`, table and list rows take `--density-row-height`, cards and panels pad with `--density-padding` and sit `--density-gap` apart. Pick sizes (`.btn-sm`, `.btn-lg`) for hierarchy, never to fix a layout, so the density stays one decision.

## Motion

- Motion is **subtle**: transitions use `--motion-duration-fast`, `--motion-duration-base` or `--motion-duration-slow` with `--motion-easing-standard`, and only on colour, shadow and position. Every animation is switched off under `prefers-reduced-motion`, so none carries information on its own.

## Accessibility

- Text and its background meet WCAG AA in both modes (4.5:1 for text, 3:1 for graphics and the
  focus ring): the pairs above are checked when the system is generated, so use a token pair as
  named and do not tint text or surfaces by hand.
- Focus is always visible: `:focus-visible` draws a ring of `--focus-ring-width` in
  `--color-primary`; do not remove it. A touch target is at least `--control-height-md` tall
  except in dense tables, where the whole row is the target.
- Information never rests on colour alone: a status pairs its colour with text or an icon, and an
  error message sits next to the field that caused it (`.field-error`).

## Content voice

- Plain, reassuring sentences. Say what happened and what to do next; no exclamation marks.
- Sentence case for headings, buttons and labels. A button says the action ("Save changes",
  "Create board"), never "OK" or "Submit"; a destructive one names what goes ("Delete 3 items").
- An empty state says what belongs here and offers the one action that fills it; an error says
  what went wrong in the person's terms and what to try, and never blames them.

<!-- arc:additions (everything below this line is kept on regeneration) -->

## Product navigation and sections

The product is a board-based task tracker. The sidebar in `app-shell.html` has four items, in this order and with these labels; a screen never adds, renames or reorders them, because the shell is the one source of truth for wayfinding.

- **Overview** (`overview`, `home` icon): the dashboard grid of stat cards, a progress chart and a side panel of recent activity. It is the landing page, so it holds summaries only and no editing.
- **Boards** (`boards`, `kanban` icon): the list of boards and each board's columns and cards. Board detail is a child of Boards, so the Boards item stays `aria-current="page"` there.
- **My tasks** (`my-tasks`, `check` icon): every task assigned to the signed-in person across boards, so they never have to open each board to find their work.
- **Settings** (`settings`, `sliders` icon): profile, workspace and notification preferences, kept last because it is visited least.

- The header carries only Search and Alerts (`.btn-icon`); a screen does not add its own header actions, so the header reads the same everywhere.
- Page-level actions such as "Create board" go in the page's `.toolbar`, not in the sidebar, since the sidebar is for places and not for actions.
- A page title matches its navigation label ("My tasks", not "Tasks assigned to me"), so people can confirm where they are.

## Imagery and illustration

- The product is data-first: pages use no photography or hero imagery, because a calm workspace should not compete with the person's own content.
- Illustration is limited to empty states: one simple line drawing in `--color-fg-faint` and `--color-primary-soft`, at most 160px wide, centred in `.empty-state`, so it supports the message without becoming decoration elsewhere.
- Illustrations use the Outline icon style (2px round-cap strokes, no gradients, no shadows), so they read as the same family as the icons.
- Avatars use `.avatar` and are always circular (`--radius-full`), because a round shape separates people from square board tiles. Show the person's photo cropped with `object-fit: cover` at 1:1; when there is none, show their initials on `--color-primary-soft` with `--color-primary-text`.
- Do not scale an avatar with a literal width. In a stack of assignees show at most three, then a "+n" count, so a card's footer stays one line.
- Board cover images are not supported; a board is identified by its name and a `--color-viz-n` swatch, taken in order, so a board's colour stays inside the chart palette.
- A user-uploaded image is shown in a fixed 16:9 frame with `object-fit: cover` and `--radius-card`, so a card grid keeps an even rhythm whatever the upload's shape.
- A placeholder for an image still loading is a flat `--color-surface-subtle` block of the final aspect ratio with no animation, so the layout does not jump.
- Every meaningful image has alt text naming the person or object; a decorative one has `alt=""`, so screen readers skip it.

## Brand wording and voice

- The product is called "Product" in the shell until a name is set; write it as one word with a capital letter, never in capitals, because the calm direction avoids shouting.
- Use the product's own nouns: **board**, **card**, **column**, **task**, **assignee**. Do not mix in "project", "ticket", "list" or "issue", so one thing never has two names.
- Say "task" for assigned work (My tasks) and "card" for its place on a board, so the two views stay consistent.
- Address the person as "you" and the workspace as "your workspace"; avoid "we" in interface text except in support and error footers, so the interface stays about their work.
- Reassure when an action may feel risky: "Your changes are saved" after a save, "You can restore this for 30 days" beside a deletion, because the calm direction trades urgency for confidence.
- Dates are relative within a week ("Today", "Tomorrow", "Mon") and absolute after that ("12 Dec"); an overdue date is paired with the word "Overdue" in a danger `.badge`, so lateness is never shown by colour alone.
- Counts are numerals with the correct singular ("1 task due today", "3 tasks due today"), so text reads naturally.
- Use no jargon, abbreviations or emoji in labels; ids and keys appear in `--font-family-mono` only, because they are for copying and not for reading.
