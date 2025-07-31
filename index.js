const express = require("express");
require("dotenv").config();
const {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
} = require("discord.js");
const fs = require("fs");

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

// Servidor HTTP para manter o Replit acordado
const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("✅ Bot está vivo!");
});

app.listen(PORT, () => {
  console.log(`🌐 Servidor HTTP ouvindo na porta ${PORT}`);
});

// Carrega scrims do arquivo JSON
function loadScrims() {
  const data = fs.readFileSync("./scrims.json", "utf-8");
  return JSON.parse(data);
}

// Salva scrims no arquivo JSON
function saveScrims(scrims) {
  fs.writeFileSync("./scrims.json", JSON.stringify(scrims, null, 2));
}

// Definição dos comandos
const commands = [
  new SlashCommandBuilder()
    .setName("scrims")
    .setDescription("Lista os scrims agendados"),
  new SlashCommandBuilder()
    .setName("scrims_adicionar")
    .setDescription("Adiciona um scrim")
    .addStringOption((option) =>
      option.setName("data").setDescription("Data do scrim").setRequired(true),
    )
    .addStringOption((option) =>
      option.setName("hora").setDescription("Hora do scrim").setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName("adversario")
        .setDescription("Nome do adversário")
        .setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName("observacoes")
        .setDescription("Observações")
        .setRequired(false),
    ),
  new SlashCommandBuilder()
    .setName("scrims_remover")
    .setDescription("Remove um scrim pelo índice")
    .addIntegerOption((option) =>
      option
        .setName("indice")
        .setDescription("Número do scrim (começando em 1)")
        .setRequired(true),
    ),
].map((cmd) => cmd.toJSON());

// Registra os comandos
const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);
(async () => {
  try {
    console.log("🔄 Registrando slash commands...");
    await rest.put(
      Routes.applicationGuildCommands(
        process.env.CLIENT_ID,
        process.env.GUILD_ID,
      ),
      { body: commands },
    );
    console.log("✅ Slash commands registrados.");
  } catch (error) {
    console.error(error);
  }
})();

// Lógica dos comandos
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "scrims") {
    const scrims = loadScrims();
    if (scrims.length === 0) {
      await interaction.reply("Nenhum scrim agendado.");
      return;
    }
    let msg = "📅 **Calendário de Scrims:**\n\n";
    scrims.forEach((s, idx) => {
      msg += `**${idx + 1}.** ${s.data} ${s.hora} - vs *${s.adversario}* (${s.observacoes || "Sem observações"})\n`;
    });
    await interaction.reply(msg);
  }

  if (interaction.commandName === "scrims_adicionar") {
    // Verifica se o membro tem o cargo
    if (!interaction.member.roles.cache.has(process.env.ROLE_ID_MANAGER)) {
      await interaction.reply({
        content: "❌ Você não tem permissão para adicionar scrims.",
        ephemeral: true,
      });
      return;
    }

    const scrims = loadScrims();
    scrims.push({
      data: interaction.options.getString("data"),
      hora: interaction.options.getString("hora"),
      adversario: interaction.options.getString("adversario"),
      observacoes: interaction.options.getString("observacoes") || "",
    });
    saveScrims(scrims);
    await interaction.reply("✅ Scrim adicionado com sucesso!");
  }

  if (interaction.commandName === "scrims_remover") {
    if (!interaction.member.roles.cache.has(process.env.ROLE_ID_MANAGER)) {
      await interaction.reply({
        content: "❌ Você não tem permissão para remover scrims.",
        ephemeral: true,
      });
      return;
    }

    const indice = interaction.options.getInteger("indice") - 1;
    const scrims = loadScrims();
    if (indice < 0 || indice >= scrims.length) {
      await interaction.reply("❌ Índice inválido.");
      return;
    }
    const removido = scrims.splice(indice, 1);
    saveScrims(scrims);
    await interaction.reply(
      `✅ Scrim removido: ${removido[0].data} ${removido[0].hora} vs ${removido[0].adversario}`,
    );
  }
});

client.once("ready", () => {
  console.log(`✅ Bot logado como ${client.user.tag}`);
});

client.login(process.env.DISCORD_TOKEN);
