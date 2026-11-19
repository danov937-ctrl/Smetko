#!/bin/sh
# Вдига местния сървър за тестовете на 127.0.0.1:8093 (спира стария, ако работи).
set -e
HERE=$(cd "$(dirname "$0")" && pwd)
pkill -f "php -S 127.0.0.1:8093" 2>/dev/null || true
sleep 0.4
cd "$HERE/../public_html"
nohup php -S 127.0.0.1:8093 -t . "$HERE/router.php" >/tmp/smetko-srv.log 2>&1 &
sleep 1.2
code=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:8093/ || echo 000)
echo "сървър: $code"
[ "$code" = "200" ]
