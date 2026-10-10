/* Script de criação do banco demo - Firebird 5.0
   Uso (a partir da pasta demofirebird5):
   isql -user SYSDBA -password masterkey -i criar_banco.sql
*/
SET SQL DIALECT 3;
SET NAMES UTF8;

CREATE DATABASE 'C:\Projetos Antigravity\Lazarusweb\demofirebird5\banco.fdb'
  USER 'SYSDBA' PASSWORD 'masterkey'
  PAGE_SIZE 8192
  DEFAULT CHARACTER SET UTF8;

CREATE GENERATOR GEN_CLIENTES_ID;

CREATE TABLE CLIENTES (
  ID        INTEGER NOT NULL,
  NOME      VARCHAR(100) NOT NULL,
  ENDERECO  VARCHAR(150),
  CNPJ      VARCHAR(18),
  TELEFONE  VARCHAR(20),
  CONTATO   VARCHAR(80),
  EMAIL     VARCHAR(100),
  CONSTRAINT PK_CLIENTES PRIMARY KEY (ID)
);

SET TERM ^ ;
CREATE TRIGGER BI_CLIENTES FOR CLIENTES
ACTIVE BEFORE INSERT POSITION 0
AS
BEGIN
  IF (NEW.ID IS NULL OR NEW.ID = 0) THEN
    NEW.ID = GEN_ID(GEN_CLIENTES_ID, 1);
END^
SET TERM ; ^

COMMIT;

INSERT INTO CLIENTES (NOME, ENDERECO, CNPJ, TELEFONE, CONTATO, EMAIL) VALUES ('Comercial Aurora Ltda', 'Rua das Flores, 120 - Centro, São Paulo/SP', '12.345.678/0001-90', '(11) 3222-1001', 'Mariana Souza', 'contato@aurora.com.br');
INSERT INTO CLIENTES (NOME, ENDERECO, CNPJ, TELEFONE, CONTATO, EMAIL) VALUES ('Tecnologia Horizonte S.A.', 'Av. Paulista, 1500 - Bela Vista, São Paulo/SP', '23.456.789/0001-01', '(11) 3222-1002', 'Carlos Pereira', 'carlos@horizonte.tec.br');
INSERT INTO CLIENTES (NOME, ENDERECO, CNPJ, TELEFONE, CONTATO, EMAIL) VALUES ('Mercado Boa Compra ME', 'Rua do Comércio, 45 - Centro, Campinas/SP', '34.567.890/0001-12', '(19) 3233-2003', 'Fernanda Lima', 'fernanda@boacompra.com.br');
INSERT INTO CLIENTES (NOME, ENDERECO, CNPJ, TELEFONE, CONTATO, EMAIL) VALUES ('Construtora Alicerce Ltda', 'Av. Brasil, 890 - Jardim América, Curitiba/PR', '45.678.901/0001-23', '(41) 3344-3004', 'Roberto Alves', 'roberto@alicerce.eng.br');
INSERT INTO CLIENTES (NOME, ENDERECO, CNPJ, TELEFONE, CONTATO, EMAIL) VALUES ('Farmácia Saúde Total EIRELI', 'Rua XV de Novembro, 300 - Centro, Joinville/SC', '56.789.012/0001-34', '(47) 3455-4005', 'Patrícia Gomes', 'patricia@saudetotal.com.br');
INSERT INTO CLIENTES (NOME, ENDERECO, CNPJ, TELEFONE, CONTATO, EMAIL) VALUES ('Transportadora Rota Segura', 'Rod. BR-116, km 215 - Distrito Industrial, Porto Alegre/RS', '67.890.123/0001-45', '(51) 3566-5006', 'Anderson Costa', 'anderson@rotasegura.log.br');
INSERT INTO CLIENTES (NOME, ENDERECO, CNPJ, TELEFONE, CONTATO, EMAIL) VALUES ('Padaria Pão Quente ME', 'Rua das Acácias, 77 - Savassi, Belo Horizonte/MG', '78.901.234/0001-56', '(31) 3677-6007', 'Luciana Ramos', 'luciana@paoquente.com.br');
INSERT INTO CLIENTES (NOME, ENDERECO, CNPJ, TELEFONE, CONTATO, EMAIL) VALUES ('Escola Futuro Brilhante', 'Av. das Nações, 2100 - Asa Sul, Brasília/DF', '89.012.345/0001-67', '(61) 3788-7008', 'Eduardo Martins', 'eduardo@futurobrilhante.edu.br');
INSERT INTO CLIENTES (NOME, ENDERECO, CNPJ, TELEFONE, CONTATO, EMAIL) VALUES ('Auto Peças Veloz Ltda', 'Rua Getúlio Vargas, 410 - Centro, Goiânia/GO', '90.123.456/0001-78', '(62) 3899-8009', 'Juliana Barros', 'juliana@autopecasveloz.com.br');
INSERT INTO CLIENTES (NOME, ENDERECO, CNPJ, TELEFONE, CONTATO, EMAIL) VALUES ('Hotel Vista Mar S.A.', 'Av. Beira Mar, 5000 - Meireles, Fortaleza/CE', '01.234.567/0001-89', '(85) 3900-9010', 'Ricardo Teixeira', 'reservas@vistamar.tur.br');

COMMIT;

