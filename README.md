# Portal do Aluno — CELINPB

Página de consulta para os alunos do CELINPB: frequência aula a aula, notas,
comentários dos professores, dados e links das turmas, e boletim para
imprimir. Endereço: **https://celinpb.github.io/alunos/**

O aluno entra com o **código de 9 números** e a **data de nascimento**. A
página não guarda dado nenhum: ela consulta a função `consulta-aluno` do
Supabase, que devolve só a "fotografia" daquele aluno (atualizada às 00h, 06h,
12h e 18h). Especificação completa no projeto: `claude/e1-portal-consulta-alunos.md`.

## Arquivos

| Arquivo | Para quê |
| --- | --- |
| `index.html` | A página: tela de entrada e painel do aluno |
| `app.js` | Lógica: identificação, consulta, telas, instalação |
| `estilo.css` | Visual (pensado primeiro para celular; tema escuro automático) |
| `boletim.html`, `boletim.js`, `impressao.css` | Boletim para imprimir ou salvar em PDF (A4) |
| `config.js` | Endereço da função de consulta e versão |
| `manifest.webmanifest`, `sw.js`, `icones/` | Instalação no celular (PWA) e funcionamento sem internet |

## Publicar (primeira vez)

1. No GitHub, na conta `celinpb`, crie o repositório **`alunos`** (público).
2. Envie todos os arquivos desta pasta para a raiz do repositório, mantendo a
   pasta `icones/` (botão **Add file → Upload files**, arrastando tudo).
3. **Settings → Pages**: em *Source*, escolha **Deploy from a branch**, branch
   **main**, pasta **/ (root)**, e salve.
4. Em 1–2 minutos o portal estará em `https://celinpb.github.io/alunos/`.

## Publicar uma alteração

1. Troque os arquivos alterados no repositório.
2. **Sempre** aumente a versão em dois lugares, com o mesmo número:
   - `sw.js` → `var VERSAO = 'portal-v1.0.1';`
   - `config.js` → `versao: '1.0.1'`

   É a mudança em `sw.js` que avisa os celulares com o app instalado: eles
   mostram "Há uma nova versão do portal" com o botão **Atualizar**.

## Segurança

- Não há nenhuma chave aqui. A função de consulta só aceita chamadas vindas de
  `https://celinpb.github.io` e bloqueia o código depois de 5 tentativas
  erradas.
- Nenhum texto vindo do banco é inserido como HTML (só como texto).
- A página não tem nenhum link para o sistema de gestão da escola. Mantenha
  assim.
