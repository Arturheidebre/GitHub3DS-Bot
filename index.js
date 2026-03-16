require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');

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
                type: 1, // SUB_COMMAND
            },
        ],
    },
    {
        name: 'shutdown',
        description: 'Shutdown the bot (owner only)',
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
    }, 10000); // 10 seconds
};

client.once('ready', onClientReady);
client.once('clientReady', onClientReady);

client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    if (interaction.commandName === 'cia') {
        if (interaction.options.getSubcommand() === 'latest') {
            try {
                const response = await fetch('https://gitlab.com/api/v4/projects/MorrisTheGamer%2Fgithub3ds/releases');
                const data = await response.json();
                const latestRelease = data[0];

                const tagName = latestRelease.tag_name;
                const changelog = latestRelease.description;
                const downloadUrl = latestRelease.assets && latestRelease.assets.links && latestRelease.assets.links.length > 0 ? latestRelease.assets.links[0].direct_asset_url : latestRelease._links.self;

                await interaction.reply(`Latest CIA Release: ${tagName}\nDownload: ${downloadUrl}\nChangelog: ${changelog}`);
            } catch (error) {
                console.error(error);
                await interaction.reply('Error fetching latest release.');
            }
        }
    } else if (interaction.commandName === 'shutdown') {
        if (interaction.user.id !== process.env.DISCORD_OWNER_ID) {
            await interaction.reply({ content: 'You are not allowed to do that.', ephemeral: true });
            return;
        }

        await interaction.reply('Shutting down...');
        await client.destroy();
        process.exit(0);
    }
});

client.login(process.env.DISCORD_TOKEN);