<?php
/* Дневник: всички действия в админ панела (кой, кога, какво). */
declare(strict_types=1);
require __DIR__ . '/_lib.php';
require_admin();
$pdo = db();
$q = trim((string)($_GET['q'] ?? ''));
$page = max(1, (int)($_GET['p'] ?? 1)); $per = 100;
$where = $q !== '' ? 'WHERE action LIKE ? OR details LIKE ?' : '';
$args = $q !== '' ? ["%$q%", "%$q%"] : [];
$n = $pdo->prepare("SELECT COUNT(*) FROM audit $where"); $n->execute($args); $total = (int)$n->fetchColumn();
$st = $pdo->prepare("SELECT * FROM audit $where ORDER BY id DESC LIMIT $per OFFSET " . (($page - 1) * $per)); $st->execute($args);
$rows = '';
foreach ($st as $r) $rows .= '<tr><td style="white-space:nowrap">' . h(date('d.m.Y H:i', strtotime($r['ts'] . ' UTC'))) . '</td><td><b>' . h($r['action']) . '</b></td><td>' . h($r['details']) . '</td><td class="muted">' . h($r['ip']) . '</td></tr>';
$pages = max(1, (int)ceil($total / $per));
$nav = $pages > 1 ? '<div class="row">' . ($page > 1 ? '<a class="btn sm ghost" href="?q=' . urlencode($q) . '&amp;p=' . ($page - 1) . '">← По-нови</a>' : '') . '<span class="muted">страница ' . $page . ' от ' . $pages . '</span>' . ($page < $pages ? '<a class="btn sm ghost" href="?q=' . urlencode($q) . '&amp;p=' . ($page + 1) . '">По-стари →</a>' : '') . '</div>' : '';
page('Дневник на действията', '<div class="card"><form class="filters" method="get"><label>Търсене<input name="q" value="' . h($q) . '" placeholder="действие или подробности"></label><button class="blue sm">🔍</button></form>' .
    ($rows ? '<div class="tw"><table><thead><tr><th>Кога</th><th>Действие</th><th>Подробности</th><th>IP</th></tr></thead><tbody>' . $rows . '</tbody></table></div>' . $nav : '<p class="muted">Няма записи.</p>') .
    '<p class="hint">Тук се записва всяко действие в панела, включително входовете и грешните пароли.</p></div>');
