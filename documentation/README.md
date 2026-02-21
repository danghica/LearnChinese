# Chinese vocabulary chat — Documentation

This folder documents the current implementation of the app. It is generated from the project plan and describes stack, data model, API, UI, and deployment.

## Contents

- [Stack](stack.md) — Framework, database, LLM, segmentation, word list
- [Data model](data-model.md) — Tables and vocabulary selection
- [API routes](api-routes.md) — Endpoints and behaviour
- [UI flow](ui-flow.md) — Screens, components, and layout
- [Implementation details](implementation-details.md) — First-turn prompt, usage recording, jieba
- [Scripts and deploy](scripts-and-deploy.md) — npm scripts and hosting
- [Tests](tests.md) — Test files and coverage

## Overview

Single-user web app to practice Chinese with vocabulary-based conversations. The LLM (Groq) responds in Chinese using a selected vocabulary computed from a spaced-frequency algorithm over a 3000-word database (SUBTLEX-CH + CEDICT). Users can view the current working vocabulary via Settings → "Show current vocabulary" (opens /vocabulary in a new tab; debug off = comma-separated list, debug on = full DB info per word).
