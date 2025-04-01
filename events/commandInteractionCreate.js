const { Events } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');
const { checkRole } = require('../utils/helpers');
const { getConfig } = require('../database/models/config');
const { simpleEmbed, getDefaultMaintenanceEmbed } = require('../embeds/generalEmbeds');
const { validateRoleAndGuild } = require('../utils/discordValidators');
const { commandsControl } = require('../config.json');
const { handleCommandMaintenance } = require('../utils/discordUtils');

module.exports = {
	name: Events.InteractionCreate,
	async execute(interaction) {

		if (!interaction.isChatInputCommand()) {
			return;
		}

		const command = interaction.client.commands.get(interaction.commandName);
		const commandName = command.data.name;

		if (!command) {
			console.error(`No command matching ${interaction.commandName} was found.`);
			return;
		}

		// Validate guild and admin commands
		const validate = await validateRoleAndGuild(interaction);
		if (validate && !validate.success) {
			if (validate.data.embed) {
				return await interaction.reply({ embeds: [validate.data.embed] });
			}
			return;
		}

		// Handle commands control
		// if (commandsControl && commandsControl.enabled) {
		// 	const commandsControlCode = commandsControl.code;

		// 	const enabledCommmands = commandsControl.control?.enabled?.commands?.filter(Boolean);
		// 	const enabledCode = commandsControl.control?.enabled?.code;
		// 	const enabledOn = commandsControl.control?.enabled?.enabled;
		// 	const hasEnabledCommands = enabledCommmands?.length > 0;

		// 	const disabledCommands = commandsControl.control?.disabled?.commands?.filter(Boolean);
		// 	const disabledCode = commandsControl.control?.disabled?.code;
		// 	const disabledOn = commandsControl.control?.disabled?.enabled;

		// 	const commandIsEnabled = enabledCommmands?.includes(commandName);
		// 	const commandIsDisabled = disabledCommands?.includes(commandName);

		// 	const isCommandDisabled = hasEnabledCommands ? !commandIsEnabled : commandIsDisabled;

		// 	const code = hasEnabledCommands
		// 		? (enabledCode ? enabledCode : commandsControlCode)
		// 		: (commandIsDisabled ? (disabledCode ? disabledCode : commandsControlCode) : commandsControlCode);

		// 	console.log(code);
		// 	console.log(isCommandDisabled);

		// 	if (isCommandDisabled) {
		// 		switch (code) {
		// 			case 'maintenance': {
		// 				return await handleCommandMaintenance(interaction, null, null, "reply");
		// 			}
		// 			default: {
		// 				return;
		// 			}
		// 		}
		// 	}
		// }

		if (commandsControl && commandsControl.enabled) {
			const commandsControlMessage = commandsControl.message;
		
			const enabledCommands = commandsControl.control?.enabled?.commands?.filter(Boolean);
			const enabledMessage = commandsControl.control?.enabled?.message;
			const enabledOn = commandsControl.control?.enabled?.enabled; // should be true/false
		
			const disabledCommands = commandsControl.control?.disabled?.commands?.filter(Boolean);
			const disabledMessage = commandsControl.control?.disabled?.message;
			const disabledOn = commandsControl.control?.disabled?.enabled; // should be true/false
		
			const commandIsEnabled = enabledCommands?.includes(commandName);
			const commandIsDisabled = disabledCommands?.includes(commandName);

			let isCommandDisabled;
			if (enabledOn && enabledCommands?.length > 0) {
				isCommandDisabled = !commandIsEnabled;
			} else if (disabledOn) {
				isCommandDisabled = commandIsDisabled;
			} else {
				isCommandDisabled = false; // No control applied.
			}

			let message;
			if (enabledOn && enabledCommands?.length > 0) {
				message = enabledMessage ? enabledMessage : commandsControlMessage;
			} else if (disabledOn && isCommandDisabled) {
				message = disabledMessage ? disabledMessage : commandsControlMessage;
			} else {
				message = commandsControlMessage;
			}
		
			if (isCommandDisabled) {
				const maintenanceMessage = message || "⚠️ \u200b This command is currently disabled";
				return await handleCommandMaintenance(interaction, maintenanceMessage, null, "reply");
			}
		}

		try {
			if ('execute' in command) {
				await command.execute(interaction);
			} else if ('run' in command) {
				await command.run(interaction);
			} else {
				console.log("Error running command");
			}
		} catch (error) {
			console.error(`Error executing ${interaction.commandName}`);
			console.error(error);
		}
	},
};