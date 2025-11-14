# Importer memory - UI & i18n

/remember >importer ws UI & i18n: When fixing the OggDude importer UI, always edit Less source (not compiled CSS), scope styles to Application.DEFAULT_OPTIONS.id, use max-height+overflow for internal scrolling, and avoid i18n key collisions (do not use the same key as both string and object; prefer `previewButton` for button labels and `preview.*` for panel strings). Recompile assets and add lightweight CI check for critical i18n keys.
