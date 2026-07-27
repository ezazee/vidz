# Changelog

All notable changes to this project will be documented in this file.

## [1.1.0] - 2026-07-27

### Fixed
- **Bug Fix (VID-1)**: Resolved HTTP 409 error when creating duplicate topics in the workflow for BrainWhy and Cerita Tetangga channels. Previously, attempting to create a project with a topic that already existed would result in a hard `409 Conflict` error, blocking the workflow. The `/api/projects` POST endpoint now automatically varies the title (e.g., appending `(1)`, `(2)`) to ensure uniqueness, allowing the workflow to proceed without manual intervention.

## [0.1.0] - Initial Release

- Initial project structure and core features.