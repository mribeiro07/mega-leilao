# MegaLeilão — Versão completa de desenvolvimento

Requer Node.js 18+.

1. Extraia o ZIP.
2. Abra o terminal nessa pasta.
3. Rode `node server.js`.
4. Acesse `http://localhost:3000`.
5. Painel administrativo: `http://localhost:3000/admin.html`.

Inclui frontend responsivo, API Node.js, cadastro/login, sessões, catálogo, detalhes de lote, lances, histórico de lances, painel administrativo, estatísticas, gestão básica de usuários e criação/exclusão de lotes.

Para liberar o administrador: crie uma conta no site, pare o servidor, abra `data.json`, altere o `role` dessa conta de `user` para `admin`, salve e reinicie.

IMPORTANTE: esta é uma base de desenvolvimento. Os lotes e lances são fictícios. Para produção é necessário banco de dados, HTTPS, hashing de senha seguro, sessões/cookies seguros, CSRF, rate limiting, auditoria, backups, monitoramento, antifraude, pagamentos e revisão jurídica/regulatória.
