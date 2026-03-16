# Discord Bot for 3DS Homebrew Releases

A Discord bot that changes its status every 10 seconds and provides the latest 3DS CIA release information.

## Features

- Status cycling between "GitHub3DS" and "TML" every 10 seconds
- Slash command `/cia latest` to fetch the latest CIA release from the 3DS Homebrew Releases repository

## Setup

1. Create a Discord bot at https://discord.com/developers/applications
2. Copy the bot token and client ID
3. Update `.env` with your `DISCORD_TOKEN` and `DISCORD_CLIENT_ID`
4. Invite the bot to your server with appropriate permissions
5. Run `npm start` to start the bot

## Usage

- The bot will automatically change its status
- Use `/cia latest` in your Discord server to get the latest release info