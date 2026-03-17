require('dotenv').config();
const {
    Client,
    GatewayIntentBits,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder,
    EmbedBuilder
} = require('discord.js');

const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const http = require('http');

const client = new Client({
    intents: [GatewayIntentBits.Guilds],
});

const commands = [
    {
        name: 'cia',
        description: 'Get latest 3DS CIA release',
        options: [
            {
                name: 'latest',
                description: 'Fetch the latest CIA release',
                type: 1,
            },
        ],
    },
    {
        name: 'shutdown',
        description: 'Shutdown the bot (owner only)',
    },
    {
        name: 'bug',
        description: 'Report a bug',
    },
];

const rest = new REST({ version: '9' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
    try {
        console.log('Started refreshing application (/) commands.');

        await rest.put(
            Routes.applicationCommands(process.env.DISCORD_CLIENT_ID),
            { body: commands },
        );

        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error(error);
    }
})();

const onClientReady = () => {
    console.log(`Logged in as ${client.user.tag}!`);

    let statusIndex = 0;
    const statuses = ['GitHub3DS', 'TML'];

    setInterval(() => {
        client.user.setActivity(statuses[statusIndex]);
        statusIndex = (statusIndex + 1) % statuses.length;
    }, 10000);
};

client.once('ready', onClientReady);
client.once('clientReady', onClientReady);

client.on('interactionCreate', async interaction => {

    // ========== SLASH COMMANDS ==========
    if (interaction.isChatInputCommand()) {

        // CIA COMMAND
        if (interaction.commandName === 'cia') {
            if (interaction.options.getSubcommand() === 'latest') {
                try {
                    const response = await fetch('https://gitlab.com/api/v4/projects/MorrisTheGamer%2Fgithub3ds/releases');
                    const data = await response.json();
                    const latestRelease = data[0];

                    const tagName = latestRelease.tag_name;
                    const changelog = latestRelease.description;
                    const downloadUrl =
                        latestRelease.assets?.links?.[0]?.direct_asset_url ||
                        latestRelease._links.self;

                    await interaction.reply(
                        `Latest CIA Release: ${tagName}\nDownload: ${downloadUrl}\nChangelog: ${changelog}`
                    );
                } catch (error) {
                    console.error(error);
                    await interaction.reply('Error fetching latest release.');
                }
            }
        }

        // SHUTDOWN COMMAND
        else if (interaction.commandName === 'shutdown') {
            if (interaction.user.id !== process.env.DISCORD_OWNER_ID) {
                await interaction.reply({ content: 'You are not allowed to do that.', ephemeral: true });
                return;
            }

            await interaction.reply('Shutting down...');
            await client.destroy();
            process.exit(0);
        }

        // BUG COMMAND → OPEN MODAL
        else if (interaction.commandName === 'bug') {

            const modal = new ModalBuilder()
                .setCustomId('bugModal')
                .setTitle('Report a Bug');

            const descriptionInput = new TextInputBuilder()
                .setCustomId('bugDescription')
                .setLabel('Describe the bug')
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(true);

            const versionInput = new TextInputBuilder()
                .setCustomId('bugVersion')
                .setLabel('Version (e.g. v1.2)')
                .setStyle(TextInputStyle.Short)
                .setRequired(true);

            const row1 = new ActionRowBuilder().addComponents(descriptionInput);
            const row2 = new ActionRowBuilder().addComponents(versionInput);

            modal.addComponents(row1, row2);

            await interaction.showModal(modal);
        }
    }

    // ========== MODAL SUBMIT ==========
    if (interaction.isModalSubmit()) {
        if (interaction.customId === 'bugModal') {

            const description = interaction.fields.getTextInputValue('bugDescription');
            const version = interaction.fields.getTextInputValue('bugVersion');

            const channel = interaction.guild.channels.cache.find(
                c => c.name === 'bug-reports'
            );

            if (!channel) {
                await interaction.reply({
                    content: '❌ Channel #bug-reports not found!',
                    ephemeral: true
                });
                return;
            }

            const embed = new EmbedBuilder()
                .setTitle('🐛 New Bug Report')
                .setColor(0xff0000)
                .addFields(
                    { name: '👤 User', value: `<@${interaction.user.id}>`, inline: false },
                    { name: '📦 Version', value: version, inline: false },
                    { name: '📝 Description', value: description, inline: false }
                )
                .setTimestamp();

            await channel.send({ embeds: [embed] });

            await interaction.reply({
                content: '✅ Bug report sent!',
                ephemeral: true
            });
        }
    }
});

client.login(process.env.DISCORD_TOKEN);

// HTTP Server (Render)
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Bot is running\n');
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});