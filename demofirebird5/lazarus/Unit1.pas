unit Unit1;

{$mode objfpc}{$H+}

interface

uses
  Classes, SysUtils, Forms, Controls, Graphics, Dialogs, StdCtrls, ExtCtrls,
  DBGrids, DBCtrls, DB, ZConnection, ZDataset;

type

  { TForm1 }

  TForm1 = class(TForm)
    ZConnection1: TZConnection;
    ZQuery1: TZQuery;
    DataSource1: TDataSource;
    pnlTop: TPanel;
    btnConectar: TButton;
    edtFiltro: TEdit;
    DBGrid1: TDBGrid;
    DBNavigator1: TDBNavigator;
    pnlEdit: TPanel;
    lblNome: TLabel;
    dbeNome: TDBEdit;
    lblEndereco: TLabel;
    dbeEndereco: TDBEdit;
    lblCnpj: TLabel;
    dbeCnpj: TDBEdit;
    lblTelefone: TLabel;
    dbeTelefone: TDBEdit;
    lblContato: TLabel;
    dbeContato: TDBEdit;
    lblEmail: TLabel;
    dbeEmail: TDBEdit;
    btnGravar: TButton;
    btnExcluir: TButton;
    procedure btnConectarClick(Sender: TObject);
    procedure btnGravarClick(Sender: TObject);
    procedure btnExcluirClick(Sender: TObject);
    procedure edtFiltroChange(Sender: TObject);
    procedure FormCreate(Sender: TObject);
  private
    procedure AbrirClientes;
  end;

var
  Form1: TForm1;

implementation

{$R *.lfm}

{ TForm1 }

procedure TForm1.FormCreate(Sender: TObject);
begin
  // O banco fica na pasta acima desta (demofirebird5\banco.fdb)
  ZConnection1.Database := ExpandFileName(ExtractFilePath(ParamStr(0)) + '..' + PathDelim + 'banco.fdb');
  btnConectarClick(nil);
end;

procedure TForm1.btnConectarClick(Sender: TObject);
begin
  try
    ZConnection1.Connect;
    AbrirClientes;
    Caption := 'CRUD Clientes - Firebird 5.0 (' + ZConnection1.Database + ')';
  except
    on E: Exception do
      ShowMessage('Falha ao conectar no Firebird 5.0: ' + E.Message);
  end;
end;

procedure TForm1.AbrirClientes;
begin
  ZQuery1.Close;
  ZQuery1.SQL.Text :=
    'SELECT ID, NOME, ENDERECO, CNPJ, TELEFONE, CONTATO, EMAIL FROM CLIENTES ' +
    'WHERE NOME LIKE :FILTRO ORDER BY ID';
  ZQuery1.ParamByName('FILTRO').AsString := '%' + edtFiltro.Text + '%';
  ZQuery1.Open;
end;

procedure TForm1.edtFiltroChange(Sender: TObject);
begin
  if ZConnection1.Connected then
    AbrirClientes;
end;

procedure TForm1.btnGravarClick(Sender: TObject);
begin
  if ZQuery1.State in [dsEdit, dsInsert] then
    ZQuery1.Post;
  ZQuery1.ApplyUpdates;   // grava no banco
  ZConnection1.Commit;    // confirma a transação
  AbrirClientes;
end;

procedure TForm1.btnExcluirClick(Sender: TObject);
begin
  if ZQuery1.IsEmpty then Exit;
  if MessageDlg('Excluir', 'Excluir o cliente "' + ZQuery1.FieldByName('NOME').AsString + '"?',
    mtConfirmation, [mbYes, mbNo], 0) = mrYes then
  begin
    ZQuery1.Delete;
    ZQuery1.ApplyUpdates;
    ZConnection1.Commit;
  end;
end;

end.
