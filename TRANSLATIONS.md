# Translation status

| Locale | Code | Status | Notes |
|---|---|---|---|
| English | `en` | Base | Default |
| Spanish | `es` | Complete | First-pass |
| Portuguese | `pt` | Complete | First-pass |
| French | `fr` | Complete | First-pass |

To add a new language:

1. Copy `frontend/src/i18n/locales/en.json` to `<code>.json`.
2. Translate values, leave keys untouched.
3. Add `<code>` to `LANGUAGES` and `resources` in `frontend/src/i18n/index.ts`.
4. Open a PR.