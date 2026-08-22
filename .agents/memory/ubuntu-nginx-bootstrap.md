---
name: Ubuntu Nginx bootstrap
description: Compatibility lessons from provisioning an existing Ubuntu 20.04 host with Nginx and Certbot 0.40.
---

On an existing Ubuntu host, preflight enabled Nginx sites before installing or upgrading Nginx. A dangling enabled-site symlink can make the package post-install script fail because it runs `nginx -t` before the application bootstrap reaches its own Nginx setup.

**Why:** The staging host already contained legacy virtual hosts and a dangling `default` symlink. Ubuntu's Nginx package configuration stopped at that inherited error. Certbot 0.40 also failed when server-name hash sizing lived in `conf.d`, because its temporary challenge configuration injected a duplicate directive.

**How to apply:** Remove only dangling enabled-site links before apt operations, preserve unrelated virtual hosts, and put `server_names_hash_bucket_size` in the main `http` block when using the Ubuntu 20.04 Certbot Nginx plugin. Under `pipefail`, avoid early-exit consumers that can turn an otherwise successful producer into a SIGPIPE 141 failure.
