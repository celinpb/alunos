// ============================================================
// config.js — Configurações globais do front-end
// Portal do Aluno — CELINPB
// ============================================================
// ⚠️  Substitua SCRIPT_URL pela URL real do Apps Script
//     após publicar: Implantar → Nova implantação → Aplicativo da Web
// ============================================================

const App = {

  SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbz3DMSCvd-yPpKAZSVm1Su0V3MoedtlZlwlPeHO09by3podV8DlvVp7HT0GDOc5N01K/exec',

  VERSION: '1.0.0',

  // Mapa de módulos conhecido pelo front-end.
  // A visibilidade real vem do back-end via getModulos().
  MODULOS: {
    turmas      : { nome: 'Turmas Atuais',    icone: 'fa-solid fa-book-open',        rota: 'turmas',       desc: 'Frequência, notas e conteúdo'  },
    avisos      : { nome: 'Avisos',           icone: 'fa-solid fa-bell',             rota: 'avisos',       desc: 'Comunicados da escola'          },
    calendario  : { nome: 'Calendário',       icone: 'fa-solid fa-calendar-days',    rota: 'calendario',   desc: 'Datas e eventos do semestre'    },
    documentos  : { nome: 'Documentos',       icone: 'fa-solid fa-file-lines',       rota: 'documentos',   desc: 'Declarações e atestados'        },
    rematricula : { nome: 'Rematrícula',      icone: 'fa-solid fa-rotate',           rota: 'rematricula',  desc: 'Solicitar rematrícula'          },
    historico   : { nome: 'Histórico',        icone: 'fa-solid fa-clock-rotate-left',rota: 'historico',    desc: 'Semestres anteriores'           },
    chamados    : { nome: 'Chamados',         icone: 'fa-solid fa-headset',          rota: 'chamados',     desc: 'Solicitações e atendimentos'    },
    admin       : { nome: 'Gestão',           icone: 'fa-solid fa-sliders',          rota: 'admin',        desc: 'Painel administrativo',  papeis: ['admin'] },
    perfil      : { nome: 'Meu Perfil',       icone: 'fa-solid fa-user-circle',      rota: 'perfil',       desc: 'Seus dados cadastrais'          },
  },

  PAPEIS_STAFF: ['admin', 'coordenacao', 'secretaria', 'professor']
};
