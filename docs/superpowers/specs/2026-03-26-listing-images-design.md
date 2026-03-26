# Listing Images Design

## Goal

Allow a user to create a listing first, then upload up to three images one at a time with visible progress, retry failed uploads, and cancel remaining uploads without deleting the listing or already-saved images.

## Scope

This design replaces the current incomplete listing-image draft. Existing listing-level image fields and related abandoned code should be removed where they do not support the accepted behavior.

## Architecture

The listing record remains image-free. The client submits the existing Add a Listing form as JSON to create the listing first. If listing creation succeeds, the client uploads each selected file in sequence to a dedicated image upload endpoint using `multipart/form-data`.

Each image upload is independent:

- The request carries exactly one image file.
- The request includes the `listing_id`.
- The server derives `owner_id` from the authenticated session.
- A successful upload writes one file to local storage and inserts one row into the image table.

If any upload fails, the listing remains created. Previously uploaded images remain saved. Remaining files stay in the client queue and can be retried or cancelled by the user. Cancelling stops further uploads but does not delete records or files that already exist.

## Client Design

### Form changes

The Add a Listing page will:

- Remove abandoned listing image URL fields and related state.
- Add a file input that accepts `.webp`, `.png`, `.jpg`, and `.jpeg`.
- Limit selection to at most three files.
- Validate file count and type before the listing creation request is sent.

### Submission flow

The submission flow is:

1. Validate game, price, and selected files.
2. Create the listing with `POST /api/listings`.
3. If listing creation succeeds, upload images sequentially with `POST /api/listing-images`.
4. Update visible upload state after each file completes or fails.
5. If all uploads succeed, show overall success.
6. If any upload fails, pause the queue and show retry/cancel controls.

Sequential upload is preferred over parallel upload because it keeps the progress model simple, matches the one-image-per-request server contract, and makes partial failure handling explicit.

### Upload state model

Each selected file will have local UI state:

- `pending`
- `uploading`
- `uploaded`
- `failed`
- `cancelled`

The page will also keep:

- The created `listingId` once listing creation succeeds
- A flag for whether listing creation is in progress
- A flag for whether image uploads are active
- A summary message for success or failure

After a partial failure:

- `Retry` retries only files in `failed` state, in order.
- `Cancel` marks remaining not-yet-uploaded files as cancelled and ends the upload flow.
- The listing remains valid and persisted regardless of retry or cancel.

### Progress display

The UI will show:

- A listing creation phase while the initial record is being created
- Per-file progress state while each image is uploading
- Aggregate status such as `2 of 3 uploaded`

The accepted scope requires progress visibility, not byte-level upload percentages. Status-driven progress is sufficient unless the current codebase already has a lightweight byte-progress pattern ready to reuse.

## Server Design

### Database

Add a new `listing_images` table in SQLite with these fields:

- `id TEXT PRIMARY KEY`
- `listing_id TEXT NOT NULL`
- `owner_id TEXT NOT NULL`
- `original_filename TEXT NOT NULL`
- `stored_filename TEXT NOT NULL`
- `mime_type TEXT NOT NULL`
- `created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP`

Constraints and indexes:

- Foreign key from `listing_id` to `listings(id)` with `ON DELETE CASCADE`
- Foreign key from `owner_id` to `users(id)` with `ON DELETE CASCADE`
- Index on `listing_id`
- Index on `owner_id`

The `listings` table should not store image URLs or image ids. Any incomplete schema fields added for the abandoned draft should be removed if present.

### File storage

Images are stored on the local filesystem in a dedicated uploads directory under the project data area. The server creates the directory if it does not exist.

For each accepted upload:

- Generate a GUID-based filename
- Preserve the original extension normalized from the uploaded file
- Save the file bytes locally using the generated filename
- Store the generated filename in `stored_filename`

The server does not trust the original filename for storage identity.

### Upload route

Create a new authenticated resource:

- `POST /api/listing-images`

Request requirements:

- `multipart/form-data`
- Exactly one file field
- A `listing_id` field

Validation rules:

- Reject if `listing_id` is missing
- Reject if no file is included
- Reject if more than one file is included
- Reject if the file is not `image/webp`, `image/png`, or `image/jpeg`
- Reject if the listing does not exist
- Reject if the authenticated user does not own the listing

Success behavior:

- Save the file to disk
- Insert the image row
- Return the created image record metadata needed by the client

Failure behavior:

- Return a clear `4xx` error for validation and ownership failures
- Return a `5xx` error if file persistence or database insertion fails unexpectedly

When file persistence succeeds but database insertion fails, the server should remove the newly written file before returning an error to avoid orphaned files from that request.

## Data access changes

The listing data access layer should be simplified to match the new model:

- Remove abandoned `image_url`, `image_thumbnail_url`, and `image_ids` usage from listing creation and updates
- Keep listing creation focused on listing fields only
- Add a new image table module responsible for image inserts and image lookup by listing when needed

The image resource should verify the listing ownership before creating an image record.

## Error handling

### Client

- Block submit when more than three files are selected
- Block submit when any selected file has an unsupported type
- Stop image uploads if listing creation fails
- Pause the upload queue on the first failed image upload
- Allow retry of failed uploads without recreating the listing
- Allow cancel after partial success without cleanup

### Server

- Return `400` for malformed upload requests and invalid file counts
- Return `401` for unauthenticated requests
- Return `404` when the listing does not exist or is not owned by the authenticated user
- Return `400` for unsupported file types

## Testing Strategy

### Server tests

Add tests for:

- Listing creation no longer accepting abandoned image fields
- Image table insert and lookup behavior
- Upload route success for one valid image
- Upload route failure when no file is included
- Upload route failure when more than one file is included
- Upload route failure for unsupported image type
- Upload route failure when the listing does not belong to the authenticated user
- Cleanup behavior when database insertion fails after a file write

### Client tests

Add tests for:

- File input validation for maximum count and allowed formats
- Listing creation occurring before any image upload
- Sequential upload behavior for up to three files
- Progress/status rendering during upload
- Partial failure pausing the queue
- Retry resuming only failed uploads
- Cancel preserving the created listing state and stopping remaining uploads

## Files Likely To Change

- `src/pages/addListing.tsx`
- `server/index.ts`
- `server/routes/listings.ts`
- `server/db/schema.sql`
- `server/db/listingsTable.ts`
- New image data access module under `server/db/`
- New image upload route under `server/routes/`

## Out of Scope

- Deleting uploaded images
- Reordering images
- Editing image metadata after upload
- Serving image files publicly with a dedicated download route
- Byte-level progress bars
