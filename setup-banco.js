// Cria o banco de dados e as tabelas automaticamente.
// Rode com:  npm run db
// (Le a senha do arquivo .env e executa o banco_de_dados.sql)
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

(async () => {
  console.log('Conectando ao MySQL...');
  let conn;
  try {
    conn = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      multipleStatements: true, // permite rodar o arquivo .sql inteiro
    });
  } catch (e) {
    console.error('\n[ERRO] Nao consegui conectar no MySQL.');
    console.error('Verifique se a senha em .env (DB_PASSWORD) esta correta e se o MySQL esta ligado.');
    console.error('Detalhe tecnico:', e.message);
    process.exit(1);
  }

  try {
    const sql = fs.readFileSync(path.join(__dirname, 'banco_de_dados.sql'), 'utf8');
    console.log('Criando banco e tabelas + dados de exemplo...');
    await conn.query(sql);
    console.log('\n[OK] Banco "ecologix" criado com sucesso!');
    console.log('Agora rode:  npm start');
  } catch (e) {
    console.error('\n[ERRO] Falha ao criar o banco:', e.message);
    process.exit(1);
  } finally {
    await conn.end();
  }
})();
