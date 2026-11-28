# Storage operations

Neon branch storage is S3-compatible, not Cloudflare R2. Official docs: https://neon.com/docs/storage/s3-compatibility and https://neon.com/docs/storage/buckets and https://neon.com/docs/storage/authentication.

## Release
1. Rotate any exposed credential in the Neon control plane. Provision a dedicated public-read bucket using authorized Neon CLI/API; the public access setting is chosen at creation. Configure CORS for GET/HEAD from actual UI origins. Verify quota and use a single publisher.
2. Set ignored .env or protected CI secrets from .env.example. Never use VITE_ for secrets. `bun run assets:plan` builds and prints deterministic inventory without network access.
3. `bun run assets:install` installs the isolated pinned AWS SDK via Bun. `bun run assets:publish` uploads only missing immutable content, authenticates and anonymously GET-verifies exact SHA-256, cache headers and CORS. `bun run assets:verify` checks existing objects without writes. A failed operation never activates remote delivery. The dedicated bucket name and rotated credential must be explicitly confirmed. No automatic bucket mutation or paid provisioning.
4. After browser CORS and baseline latency checks, configure SOUND_PUBLIC_BASE_URL (or verified SOUND_CDN_BASE_URL) and SOUND_RELEASE_ID to the receipt's exact release ID in the deployment. Build validates the pin against the generated catalog and retains local delivery for mismatches. Vercel remains a full fallback; local builds without a pin are unchanged. No write secret is required in a Vite build.
5. Rollback: unset the release pin and redeploy, or redeploy a previous pinned build. No objects are deleted. Do not activate direct origin until latency is measured; Ohio origin can be slower than Vercel. CDN setup is separate and requires verified access.

Agent contract: releases/<release-id>/catalog.json and catalog.jsonl. Resolve assetKey, previewUrl and downloadUrl relative to the public bucket base. Verify sha256, use filename, preserve provenance/review flags. No signed URL or write credential in the catalog. Preview-only assets are not exported. Existing /sounds/ and Bun API routes remain served locally for compatibility. 

The initial implementation intentionally keeps local WAVs and ZIP in dist for reliable fallback. The publisher assumes a single serialized writer because conditional PUT is not documented for Neon. SDK request timeouts/retries are bounded; public readback validates bytes. The present small pack is buffered during CLI verification only; browser pack download navigates directly, with HEAD fallback. No real cloud upload, browser test or latency claim until receipts and measurements exist.

The catalog manifest is uploaded last, after all WAVs, the ZIP, license documents, JSONL and inventory have passed readback verification. The publisher also reconstructs the deterministic ZIP from catalog bytes and compares its SHA-256. The manually triggered GitHub workflow is optional; it requires a protected environment named `storage-production` with the rotated AWS credentials and public bucket configuration. It never changes the live release pin.
