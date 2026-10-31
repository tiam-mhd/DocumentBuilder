#!/bin/sh
set -eu

storage_root="${STORAGE_LOCAL_ROOT:-/var/lib/vdb/object-storage}"
if [ "$storage_root" != "/var/lib/vdb/object-storage" ]; then
  echo "STORAGE_LOCAL_ROOT must match the Runflare disk mount /var/lib/vdb/object-storage" >&2
  exit 1
fi

mkdir -p "$storage_root"
chown vdb:vdb "$storage_root"
exec /usr/bin/supervisord -n -c /etc/supervisor/supervisord.conf
