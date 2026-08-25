/**
 * @typedef {"uploaded"|"queued"|"processing"|"transcribing"|"summarizing"|"completed"|"failed"} NoteStatus
 *
 * @typedef {Object} NoteSummary
 * @property {string} summary
 * @property {string[]} key_points
 * @property {string[]} action_items
 * @property {string[]} decisions
 * @property {string[]} topics
 *
 * @typedef {Object} NoteListItem
 * @property {string} id
 * @property {string} title
 * @property {string} original_filename
 * @property {number|null} duration
 * @property {NoteStatus} status
 * @property {string} created_at
 *
 * @typedef {Object} NoteDetail
 * @property {string} id
 * @property {string} title
 * @property {string} original_filename
 * @property {number} file_size
 * @property {number|null} duration
 * @property {string} mime_type
 * @property {NoteStatus} status
 * @property {string|null} transcript
 * @property {NoteSummary|null} summary
 * @property {string|null} error_message
 * @property {string} created_at
 * @property {string} updated_at
 * @property {string|null} audio_url
 */

// This file exists purely for editor autocomplete/JSDoc typing in a plain
// JS project — nothing to export at runtime.
export {};
