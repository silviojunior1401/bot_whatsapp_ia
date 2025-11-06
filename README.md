# 🤖 Bot para WhatsApp com Ollama

Este é um bot de WhatsApp inteligente que utiliza a biblioteca **Baileys** para conexão e um servidor **Ollama** local para processamento de linguagem natural.

O bot implementa um sistema **RAG (Retrieval-Augmented Generation)**, o que significa que ele pode responder perguntas com base em uma base de conhecimento personalizada fornecida em arquivos de texto.

## ✨ Funcionalidades Principais

  * **Conexão Direta com WhatsApp:** Utiliza o `@whiskeysockets/baileys` para se conectar diretamente à API do WhatsApp Web, sem intermediários.
  * **Inteligência Local com Ollama:** Processa todas as solicitações de IA localmente usando o Ollama, garantindo privacidade e custo zero.
  * **RAG (Geração Aumentada por Recuperação):** Carrega automaticamente arquivos `.txt` e `.json` de uma pasta `knowledge`, usando esse conteúdo como contexto para as respostas da IA.
  * **Lista de Permissão (Whitelist):** Responde apenas a números de telefone pré-autorizados, definidos em um arquivo `.env`.
  * **Memória de Conversa:** Mantém um histórico de conversa para cada usuário, permitindo que o bot entenda o contexto de perguntas sequenciais.
  * **Comandos Especiais:**
      * `/ajuda`: Exibe uma mensagem de ajuda detalhando o funcionamento do bot.
      * `/Hacker <idioma>`: Permite que o usuário mude o idioma da resposta da IA (ex: `/Hacker french`).

## 🛠️ Tecnologias Utilizadas

  * **Node.js**
  * **@whiskeysockets/baileys**: Biblioteca para interação com o WhatsApp.
  * **Ollama**: Servidor local para execução de LLMs (como Gemma, Llama, etc.).
  * **Axios**: Cliente HTTP para se comunicar com a API do Ollama.
  * **dotenv**: Para gerenciamento de variáveis de ambiente.
  * **qrcode-terminal**: Para exibir o QR Code de login no terminal.

-----

## 🚀 Guia de Instalação e Configuração

Siga estes passos para colocar seu bot em funcionamento.

### Pré-requisitos

1.  **Node.js:** Certifique-se de ter o Node.js v18 ou superior instalado.
2.  **Ollama (Obrigatório):** Você **deve** ter o Ollama instalado e em execução na sua máquina.
      * O bot tentará se conectar a `http://localhost:11434`.
      * Você também precisa ter um modelo baixado. Este projeto está configurado para usar o `gemma3:4b`. Para baixá-lo, execute:
        ```bash
        ollama pull gemma3:4b
        ```

### 1\. Clonar e Instalar

Clone este repositório e instale as dependências:

```bash
git clone https://github.com/silviojunior1401/bot_whatsapp_ia
cd bot_whatsapp_ia
npm install
```

### 2\. Configurar Variáveis de Ambiente

Crie um arquivo chamado `.env` na raiz do projeto. Este arquivo conterá os números de telefone autorizados.

```bash
# .env
# Adicione os números de telefone em formato de array JSON,
# APENAS NÚMEROS, incluindo o código do país (ex: 55 para Brasil).

TELEFONES_PERMITIDOS='["5511999998888", "5511988887777"]'
```

### 3\. Adicionar Base de Conhecimento (RAG)

1.  Crie uma pasta chamada `knowledge` na raiz do projeto.
2.  Adicione quantos arquivos `.txt` ou `.json` desejar dentro desta pasta.
      * O bot irá ler **todos** os arquivos desta pasta e os anexará ao *prompt* do sistema enviado ao Ollama.

### 4\. Estrutura do Projeto

Após a configuração, seu projeto deve ter esta aparência:

```
.
├── knowledge/
│   └── frota_espacial.txt
│   └── outro_documento.json
├── auth_info_baileys/
│   └── (Arquivos de sessão do Baileys - criados automaticamente)
├── .env
├── bot.js
├── package.json
└── package-lock.json
```

-----

## ▶️ Executando o Bot

1.  Certifique-se de que seu servidor **Ollama** esteja em execução.

2.  Inicie o bot com o Node.js:

    ```bash
    node bot.js
    ```

3.  **Primeira Execução:**

      * Um QR Code aparecerá no seu terminal.
      * Abra o WhatsApp no seu celular, vá em "Aparelhos conectados" e escaneie o código.

4.  **Pronto\!**

      * O terminal mostrará "Conectado ao WhatsApp Web\!" e "Conectado ao Ollama com sucesso\!".
      * Agora, qualquer mensagem enviada de um dos números em `TELEFONES_PERMITIDOS` será processada pelo bot.

## 💬 Como Interagir com o Bot

  * **Chat Normal:** Envie qualquer pergunta. O bot usará o Ollama e a base de conhecimento da pasta `knowledge` para responder.
  * **Comando de Ajuda:**
    ```
    /ajuda
    ```
  * **Modo Hacker (Mudar Idioma):**
    ```
    /Hacker spanish
    ```
    (O bot confirmará a mudança e as próximas respostas virão em espanhol).