/**
Baileys
npm install @whiskeysockets/baileys
npm install qrcode-terminal
npm install pino
npm install @hapi/boom
npm install axios
 */

const {
	default: makeWASocket,
	DisconnectReason,
	useMultiFileAuthState,
} = require("@whiskeysockets/baileys");
const { Boom } = require("@hapi/boom");
const pino = require("pino");
const qrcode = require("qrcode-terminal");
const axios = require("axios");
const fs = require("fs");
const path = require("path");

require("dotenv").config();

const ollamaUrl = "http://localhost:11434"; // Alterar porta para 1234 se for LMStudio
const conversationHistory = new Map();
const KNOWLEDGE_FOLDER = path.join(__dirname, "knowledge");

// NOVO: Mapa para armazenar preferências de idioma por usuário
const userPreferences = new Map();

// Números autorizados
const numerosAutorizados = process.env.TELEFONES_PERMITIDOS
	? JSON.parse(process.env.TELEFONES_PERMITIDOS)
	: [];

console.log("Bot com Ollama iniciando...");
console.log(
	`Configurado para responder aos números: ${numerosAutorizados.join(
		", "
	)},\n`
);

// Adicionar carregamento de arquivos

function loadKnowledgeBase() {
	console.log("Carregando base de conhecimento...");
	if (!fs.existsSync(KNOWLEDGE_FOLDER)) {
		fs.mkdirSync(KNOWLEDGE_FOLDER, { recursive: true });
		console.log("Pasta de conhecimento criada:", KNOWLEDGE_FOLDER);
		return "";
	}

	let allContent = "";
	const files = fs.readdirSync(KNOWLEDGE_FOLDER);

	files.forEach((file) => {
		if (file.endsWith(".txt") || file.endsWith(".json")) {
			const filePath = path.join(KNOWLEDGE_FOLDER, file);
			const content = fs.readFileSync(filePath, "utf-8");
			allContent += `\n\nConteúdo do arquivo ${file}:\n${content}`;
			console.log(`Carregado arquivo: ${file}`);
		}
	});
	return allContent;
}

const knowledgeBase = loadKnowledgeBase();

// Conectando ao WhatsApp

async function connectToWhatsApp() {
	// Autenticação
	const { state, saveCreds } = await useMultiFileAuthState(
		"auth_info_baileys"
	);
	const sock = makeWASocket({
		logger: pino({ level: "silent" }),
		auth: state,
		browser: ["Bot", "Chrome", "1.0.0"],
	});

	sock.ev.on("creds.update", saveCreds);

	sock.ev.on("connection.update", (update) => {
		const { connection, lastDisconnect, qr } = update;
		if (qr) {
			console.log("Escaneio o QR Code abaixo:");
			qrcode.generate(qr, { small: true });
		} else if (connection === "close") {
			const shouldReconnect =
				(lastDisconnect.error = Boom)?.output?.statusCode !==
				DisconnectReason.loggedOut;
			if (shouldReconnect) connectToWhatsApp();
			console.log(
				"connection closed due to ",
				lastDisconnect.error,
				", reconnecting ",
				shouldReconnect
			);
		} else if (connection === "open") {
			console.log("Conectado ao WhatsApp Web!");
			axios
				.get(`${ollamaUrl}/v1/models`, { timeout: 5000 })
				.then((response) => {
					console.log("Conectado ao Ollama com sucesso!");
				})
				.catch((error) => {
					console.error(
						"Erro ao conectar ao Ollama. Verifique se o servidor Ollama está em execução."
					);
					process.exit(1);
				});
		}
	});

	// Verificar novas mensagens recebidas
	sock.ev.on("messages.upsert", async (m) => {
		const msg = m.messages[0];

		if (msg.key.fromMe || !msg.message) return;

		const from = msg.key.remoteJid;

		const numeroRemetente = from.split("@")[0];
		if (!numerosAutorizados.includes(numeroRemetente)) {
			console.log("mensagem ignorada");
			console.log(`Remetente: ${numeroRemetente}`);
			return;
		}

		const text =
			msg.message.conversation ||
			msg.message.extendedTextMessage?.text ||
			"";

		console.log("Nova mensagem recebida:", from, ": ", text);

		if (text.toLowerCase() === "/ajuda") {
			const helpMessage = `
				Olá! 👋 Eu sou um bot assistente.

				**Como eu funciono:**
				1.  Eu respondo perguntas com base em uma base de conhecimento específica.
				2.  Eu uso um modelo de linguagem (Ollama) para entender e formular as respostas.
				3.  Eu mantenho um breve histórico de nossa conversa para entender o contexto.

				**Comandos disponíveis:**
				* **/ajuda**: Mostra esta mensagem de ajuda.
				* **/Hacker <idioma>**: (Modo Hacker) Muda o meu idioma de resposta para você. Ex: \`/Hacker french\`
			`;
			await sock.sendMessage(
				from,
				{ text: helpMessage.trim() },
				{ quoted: msg }
			);
			console.log("Mensagem de ajuda enviada para", from);
			return; // Importante: não processar a mensagem com o Ollama
		}

		if (text.toLowerCase().startsWith("/hacker ")) {
			const parts = text.split(" ");
			if (parts.length > 1) {
				const newLang = parts.slice(1).join(" "); // Pega tudo depois de /hacker // Armazena a preferência do usuário
				userPreferences.set(from, { language: newLang });
				const confirmationMsg = `Modo Hacker ativado! 👾 Responderei a você em: ${newLang}`;
				await sock.sendMessage(
					from,
					{ text: confirmationMsg },
					{ quoted: msg }
				);
				console.log(
					`Idioma alterado para ${newLang} para o usuário ${from}`
				);
				return;
			}
		}

		try {
			// Verifica se o Ollama está acessível
			const isOnline = await axios
				.get(`${ollamaUrl}/v1/models`, { timeout: 5000 })
				.then(() => true)
				.catch(() => false);

			if (!isOnline) {
				await sock.sendMessage(
					from,
					{
						text: "Desculpe, o servidor Ollama não está acessível no momento.",
					},
					{ quoted: msg }
				);
				console.error("Ollama não está acessível.");
				return;
			}

			const history = conversationHistory.get(from) || [];

			const userPrefs = userPreferences.get(from) || {
				language: "português brasileiro",
			};
			const userLanguage = userPrefs.language;

			let systemMessage = `Você é um assistente útil que responde em ${userLanguage}.`;

			if (knowledgeBase) {
				systemMessage += ` Use a seguinte base de conhecimento para ajudar a responder as perguntas do usuário: ${knowledgeBase}`;
			}

			const messages = [
				...history,
				{ role: "system", content: systemMessage },
				{ role: "user", content: text },
			];

			const response = await axios.post(
				`${ollamaUrl}/v1/chat/completions`,
				{
					model: "gemma3:4b",
					messages,
					temperature: 0.7,
				},
				{ timeout: 60000 }
			);

			const aiResponse = response.data.choices[0].message.content;
			history.push({ role: "user", content: text });
			history.push({ role: "assistant", content: aiResponse });
			conversationHistory.set(from, history.slice(-20)); // Mantém apenas as últimas 20 mensagens
			await sock.sendMessage(from, { text: aiResponse }, { quoted: msg });
			console.log("Resposta enviada: ", aiResponse);
		} catch (e) {
			console.error("Erro: ", e);
			await sock.sendMessage(
				from,
				{
					text: "Desculpe, ocorreu um erro ao processar sua mensagem.",
				},
				{ quoted: msg }
			);
		}
	});
}

connectToWhatsApp();
