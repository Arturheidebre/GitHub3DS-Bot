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
        name: 'latest',
        description: 'Get latest full release (CIA + 3DSX)',
    },
    {
        name: 'shutdown',
        description: 'Shutdown the bot (owner only)',
    },
    {
        name: 'bug',
        description: 'Report a bug',
    },
    {
        name: 'install-guide',
        description: 'How to install GitHub3DS on your 3DS',
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
    const statuses = [
        'GitHub3DS',
        'TML',
        'https://github3ds.vercel.app/',
        'Hosted via Artendo'
    ];

    setInterval(() => {
        client.user.setActivity(statuses[statusIndex]);
        statusIndex = (statusIndex + 1) % statuses.length;
    }, 10000);
};

client.once('ready', onClientReady);
client.once('clientReady', onClientReady);

client.on('interactionCreate', async interaction => {

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

        // 🔥 LATEST COMMAND (NEU)
        else if (interaction.commandName === 'latest') {
            try {
                const response = await fetch('https://gitlab.com/api/v4/projects/MorrisTheGamer%2Fgithub3ds/releases');
                const data = await response.json();
                const latestRelease = data[0];

                const tagName = latestRelease.tag_name;
                const changelog = latestRelease.description || "No changelog provided.";

                let ciaUrl = null;
                let dsxUrl = null;

                const links = latestRelease.assets?.links || [];

                for (const link of links) {
                    if (link.name.endsWith('.cia')) {
                        ciaUrl = link.direct_asset_url;
                    }
                    if (link.name.endsWith('.3dsx')) {
                        dsxUrl = link.direct_asset_url;
                    }
                }

                const embed = new EmbedBuilder()
                    .setTitle(`🚀 Latest Release: ${tagName}`)
                    .setColor(0x00ff99)
                    .setDescription(changelog.substring(0, 1000))
                    .addFields(
                        {
                            name: '📦 CIA',
                            value: ciaUrl ? `[Download](${ciaUrl})` : '❌ Not available',
                            inline: true
                        },
                        {
                            name: '🧩 3DSX',
                            value: dsxUrl ? `[Download](${dsxUrl})` : '❌ Not available',
                            inline: true
                        }
                    )
                    .setTimestamp();

                await interaction.reply({ embeds: [embed] });

            } catch (error) {
                console.error(error);
                await interaction.reply('Error fetching latest release.');
            }
        }

        // SHUTDOWN
        else if (interaction.commandName === 'shutdown') {
            if (interaction.user.id !== process.env.DISCORD_OWNER_ID) {
                await interaction.reply({ content: 'You are not allowed to do that.', ephemeral: true });
                return;
            }

            await interaction.reply('Shutting down...');
            await client.destroy();
            process.exit(0);
        }

        // BUG COMMAND
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

        // INSTALL GUIDE
        else if (interaction.commandName === 'install-guide') {
            const embed = new EmbedBuilder()
                .setTitle('📖 How to Install GitHub3DS')
                .setColor(0x00aaff)
                .setThumbnail('https://gitlab.com/MorrisTheGamer/github3ds/-/raw/main/files/qr-code.png')
                .addFields(
                    {
                        name: '📋 Requirements',
                        value: '> • A hacked Nintendo 3DS\n> • FBI or another CIA installer',
                    },
                    {
                        name: '1️⃣ Open FBI',
                        value: '> Open **FBI** on your 3DS.',
                    },
                    {
                        name: '2️⃣ Install',
                        value: '> Install the CIA or scan QR code.',
                    },
                    {
                        name: '3️⃣ Done!',
                        value: '> App appears on Home Menu.',
                    }
                )
                .setFooter({ text: 'GitHub3DS • Free & Open Source' })
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
        }
    }

    // MODAL SUBMIT
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
                    { name: '👤 User', value: `<@${interaction.user.id}>` },
                    { name: '📦 Version', value: version },
                    { name: '📝 Description', value: description }
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

// HTTP Server
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Bot is running\n');
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});
