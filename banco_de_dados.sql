-- ============================================================
--  EcoLogix - Banco de Dados (MySQL 8)
--  GreenCycle Solucoes Ambientais
--  Cria o banco, as 6 tabelas do modelo + 1 tabela de usuarios
--  (login) e popula com dados de exemplo.
-- ============================================================

CREATE DATABASE IF NOT EXISTS ecologix
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE ecologix;

-- Apaga tudo antes de recriar (permite rodar este script de novo sem erro).
-- A ordem respeita as chaves estrangeiras.
DROP TABLE IF EXISTS documentoambiental;
DROP TABLE IF EXISTS residuo;
DROP TABLE IF EXISTS ordemdeservico;
DROP TABLE IF EXISTS motorista;
DROP TABLE IF EXISTS veiculo;
DROP TABLE IF EXISTS cliente;
DROP TABLE IF EXISTS usuario;

-- ------------------------------------------------------------
-- USUARIO  (tela de Login e Cadastro)
-- ------------------------------------------------------------
CREATE TABLE usuario (
  id_usuario INT AUTO_INCREMENT PRIMARY KEY,
  nome       VARCHAR(100) NOT NULL,
  sobrenome  VARCHAR(100),
  email      VARCHAR(150) NOT NULL UNIQUE,
  senha      VARCHAR(255) NOT NULL,
  cnpj_cpf   VARCHAR(25),
  perfil     ENUM('cliente','motorista','atendente','gerente') NOT NULL DEFAULT 'cliente',
  criado_em  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------
-- CLIENTE
-- ------------------------------------------------------------
CREATE TABLE cliente (
  id_cliente INT AUTO_INCREMENT PRIMARY KEY,
  nome       VARCHAR(150) NOT NULL,
  cnpj       VARCHAR(25),
  email      VARCHAR(150),
  endereco   VARCHAR(255)
);

-- ------------------------------------------------------------
-- VEICULO
-- ------------------------------------------------------------
CREATE TABLE veiculo (
  placa            VARCHAR(10) PRIMARY KEY,
  modelo           VARCHAR(100),
  capacidade_carga DECIMAL(10,2)   -- em kg
);

-- ------------------------------------------------------------
-- MOTORISTA
-- ------------------------------------------------------------
CREATE TABLE motorista (
  id_motorista  INT AUTO_INCREMENT PRIMARY KEY,
  nome          VARCHAR(150) NOT NULL,
  licenca       VARCHAR(50),
  placa_veiculo VARCHAR(10),
  CONSTRAINT fk_motorista_veiculo FOREIGN KEY (placa_veiculo)
    REFERENCES veiculo(placa) ON DELETE SET NULL ON UPDATE CASCADE
);

-- ------------------------------------------------------------
-- ORDEM DE SERVICO  (nucleo do sistema)
-- ------------------------------------------------------------
CREATE TABLE ordemdeservico (
  id_os            INT AUTO_INCREMENT PRIMARY KEY,
  id_cliente       INT,
  id_motorista     INT,
  data_solicitacao DATE,
  status           ENUM('Pendente','Em rota','Concluida','Cancelada') NOT NULL DEFAULT 'Pendente',
  peso_total       DECIMAL(10,2) DEFAULT 0,
  CONSTRAINT fk_os_cliente   FOREIGN KEY (id_cliente)   REFERENCES cliente(id_cliente)     ON DELETE SET NULL,
  CONSTRAINT fk_os_motorista FOREIGN KEY (id_motorista) REFERENCES motorista(id_motorista) ON DELETE SET NULL
);

-- ------------------------------------------------------------
-- RESIDUO  (materiais coletados em cada OS)
-- ------------------------------------------------------------
CREATE TABLE residuo (
  id_residuo    INT AUTO_INCREMENT PRIMARY KEY,
  id_os         INT,
  tipo_material VARCHAR(50),
  peso_estimado DECIMAL(10,2),
  peso_real     DECIMAL(10,2),
  CONSTRAINT fk_residuo_os FOREIGN KEY (id_os) REFERENCES ordemdeservico(id_os) ON DELETE CASCADE
);

-- ------------------------------------------------------------
-- DOCUMENTO AMBIENTAL  (MTR / CDF)
-- ------------------------------------------------------------
CREATE TABLE documentoambiental (
  id_documento INT AUTO_INCREMENT PRIMARY KEY,
  id_os        INT,
  numero_mtr   VARCHAR(50),
  data_emissao DATE,
  tipo         ENUM('MTR','CDF') NOT NULL DEFAULT 'MTR',
  CONSTRAINT fk_doc_os FOREIGN KEY (id_os) REFERENCES ordemdeservico(id_os) ON DELETE CASCADE
);

-- ============================================================
--  DADOS DE EXEMPLO
-- ============================================================

-- Usuario de demonstracao (use para fazer o primeiro login):
--   E-mail: pedro@ecologix.com    Senha: 123456
INSERT INTO usuario (nome, sobrenome, email, senha, cnpj_cpf, perfil) VALUES
  ('Pedro', 'Henrique', 'pedro@ecologix.com', '123456', '111.111.111-11', 'gerente'),
  ('Jaiane','Goncalves','jaiane@ecologix.com','123456', '222.222.222-22', 'atendente');

INSERT INTO cliente (nome, cnpj, email, endereco) VALUES
  ('Metalurgica Braga',     '12.345.678/0001-01', 'contato@braga.com',   'Distrito Industrial, Araguari - MG'),
  ('Supermercado Vivo',     '23.456.789/0001-02', 'compras@vivo.com',    'Av. Central, 1200, Araguari - MG'),
  ('Industria Fortes',      '34.567.890/0001-03', 'sac@fortes.com',      'Rod. BR-050, km 12, Araguari - MG'),
  ('Condominio Araguari',   '45.678.901/0001-04', 'sindico@araguari.com','Rua das Acacias, 45, Araguari - MG'),
  ('Fabrica Sul Mineiro',   '56.789.012/0001-05', 'adm@sulmineiro.com',  'Distrito Industrial II, Araguari - MG');

INSERT INTO veiculo (placa, modelo, capacidade_carga) VALUES
  ('ABC1D23', 'Caminhao VW Delivery',  8000.00),
  ('EFG4H56', 'Caminhao Mercedes Atego', 12000.00),
  ('IJK7L89', 'Iveco Daily',           3500.00);

INSERT INTO motorista (nome, licenca, placa_veiculo) VALUES
  ('Joao Silva',   'AB123456', 'ABC1D23'),
  ('Marcos Costa', 'CD234567', 'EFG4H56'),
  ('Rafael Lima',  'EF345678', 'IJK7L89');

INSERT INTO ordemdeservico (id_cliente, id_motorista, data_solicitacao, status, peso_total) VALUES
  (5, 3, '2026-05-15', 'Cancelada', 410),   -- OS #1  Fabrica Sul Mineiro
  (4, NULL, '2026-05-16', 'Pendente', 90),   -- OS #2  Condominio Araguari
  (3, 2, '2026-05-17', 'Concluida', 540),   -- OS #3  Industria Fortes
  (2, 1, '2026-05-18', 'Concluida', 180),   -- OS #4  Supermercado Vivo
  (1, 1, '2026-05-19', 'Em rota',   320);   -- OS #5  Metalurgica Braga

-- Residuos por categoria (total ~4.280 kg, batendo com o dashboard)
INSERT INTO residuo (id_os, tipo_material, peso_estimado, peso_real) VALUES
  (3, 'Plastico', 500, 540),
  (4, 'Papel',    160, 180),
  (5, 'Plastico', 300, 320),
  (1, 'Metal',    400, 410),
  (2, 'Vidro',     80,  90),
  (3, 'Plastico', 980, 980),
  (4, 'Papel',   1030,1030),
  (5, 'Metal',    420, 420),
  (3, 'Vidro',    310, 310);

INSERT INTO documentoambiental (id_os, numero_mtr, data_emissao, tipo) VALUES
  (3, 'MTR-2026-0039', '2026-05-17', 'MTR'),
  (3, 'CDF-2026-0039', '2026-05-17', 'CDF'),
  (4, 'MTR-2026-0040', '2026-05-18', 'MTR');
