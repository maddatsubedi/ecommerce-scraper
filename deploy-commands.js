const { REST, Routes } = require('discord.js');
const { clientId, guildId, token } = require('./config.json');
const fs = require('node:fs');
const path = require('node:path');
const { getFiles } = require('./utils/helpers');


const commandsDir = path.join(__dirname, 'commands');
const commandFiles = getFiles(commandsDir, '.js', 2); 

const commands = [];

for (const filePath of commandFiles) {
    const command = require(filePath);
    if ('data' in command && 'execute' in command) {
        commands.push(command.data.toJSON());
    } else {
        console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
    }
}

const rest = new REST().setToken(token);

(async () => {
	try {

		console.log(`Started refreshing ${commands.length} application (/) commands.`);

		const data = await rest.put(
			// Routes.applicationCommands(clientId), // To deploy global commands
			Routes.applicationGuildCommands(clientId, guildId), // To deploy guild commands
			// Routes.applicationGuildCommands(clientId, '1312403263643189310'), // To deploy guild commands (Sniper Ressel)
			{ body: commands },
		);

		console.log(`Successfully reloaded ${data?.length} application (/) commands.`);
	} catch (error) {
		console.error(error);
	}
})();