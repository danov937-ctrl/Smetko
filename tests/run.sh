#!/bin/sh
# Пуска всички проверки: вдига сървъра, нулира базата и минава по тестовете.
HERE=$(cd "$(dirname "$0")" && pwd)
sh "$HERE/serve.sh" || exit 1
python3 "$HERE/setup.py" >/dev/null 2>&1
bad=0
for t in smoke.py content.py; do
  out=$(python3 "$HERE/$t" 2>&1)
  p=$(printf '%s\n' "$out" | grep -c '^PASS')
  f=$(printf '%s\n' "$out" | grep -c '^FAIL ')
  echo "== $t  PASS=$p  FAIL=$f"
  [ "$f" = "0" ] || { printf '%s\n' "$out" | grep -E '^FAIL |Traceback|Error' | head -6; bad=1; }
  printf '%s\n' "$out" | grep -q 'FAILS 0' || bad=1
done
[ "$bad" = "0" ] && echo "ВСИЧКО Е НАРЕД" || echo "ИМА ГРЕШКИ"
exit $bad
