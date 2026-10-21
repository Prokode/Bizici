# Persistent photos on Ubuntu

The Ubuntu service uses local persistent storage for product and shop/brand
photos. Replit previews retain their existing App Storage configuration.
No MongoDB or authentication migration is required.

## One-time setup on an existing server

From a checkout of the test branch, run:

```sh
sudo bash deploy/staging/configure-photo-storage.sh
```

If the public API uses another hostname, pass its HTTPS origin as the first
argument. It must be the API origin used by the mobile apps, not the admin,
website or Expo/Metro origin.

This installs a systemd drop-in and gives only the `bizici` service user access
to `/var/lib/bizici/photos`. It preserves `/etc/bizici/api.env` and all secrets.
New installs already include these settings in the service unit. Deploying an
API release alone cannot change the previously installed systemd unit.

## Storage and safety

- Photo files live outside `/opt/bizici/releases` and survive deployments and
  rollbacks. Never put this directory in a release-cleanup job.
- Upload URLs expire after 15 minutes and are signed using the existing
  `ADMIN_JWT_SECRET` (at least 32 characters). Do not expose that secret.
- Image type and byte count are bounded, then checked before publication.
  Upload capabilities cannot overwrite an existing upload or a published photo.
- Brand-photo upload tickets are bound to the selected shop. Existing owner and
  shop-member authorization checks remain in place.
- Temporary and published files are not served as a static directory. Public
  reads use the existing photo routes and database references.
- Existing external image URLs are preserved. Historical device-only photos
  must still be reselected on the seller's device.
- Changing providers does not migrate pre-existing App Storage objects. If such
  objects exist, retain their original storage access or migrate them explicitly.

## Backups and capacity

Back up `/var/lib/bizici/photos` together with MongoDB. A database backup alone
does not contain the image bytes. Keep backups outside this directory and test
restoration before relying on them. Monitor free space; a full disk fails
uploads explicitly. This setup targets one persistent Ubuntu server, not
multiple servers with independent disks.
