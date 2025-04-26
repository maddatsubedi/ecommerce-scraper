const { EmbedBuilder } = require('discord.js');
const { getAvailabeLocales } = require('../utils/helpers');

const simpleEmbed = ({ title, color, description, setTimestamp, footer, footerIcon }) => {
	const embed = new EmbedBuilder()

	if (title) embed.setTitle(title);
	if (color) embed.setColor(color);
	if (description) embed.setDescription(description);
	if (setTimestamp) embed.setTimestamp();
	if (footer) embed.setFooter({ text: footer, iconURL: footerIcon ? footerIcon : null });

	return embed;
}

const availableLocales = getAvailabeLocales();

const localesString = availableLocales?.map(locale => `\`${locale}\``).join(`\n`);

const localesEmbed = (title) => {
	const embed = simpleEmbed({
		description: `${title ? `${title}\n\n` : ``}**Following domains are supported:**\n\n>>> **${localesString}**`, color: 'Red'
	});

	return embed;
}

const commandPermissionEmbed = simpleEmbed({
	description: '⚠️ \u200b You do not have permission to use this command',
	color: 'Red'
})

const guildPermissionEmbed = simpleEmbed({
	description: '⚠️ \u200b You cannot use this bot in this server',
	color: 'Red'
})

const getDefaultErrorEmbed = (text) => {
	const defaultDescription = `❗ \u200b Something went wrong. Please try again later`;
	const textDescription = `❗ \u200b ${text}`;

	const description = text ? textDescription : defaultDescription;

	const embed = simpleEmbed({
		description: description,
		color: 'Red'
	});

	return embed;
}

const getDefaultMaintenanceEmbed = (text) => {
	const defaultDescription = `⚠️ \u200b This command is temporarily disabled for maintenance`;

	const description = text || defaultDescription;

	const embed = simpleEmbed({
		description: description,
		color: 'Red'
	});

	return embed;
}

module.exports = {
	simpleEmbed,
	localesEmbed,
	getDefaultErrorEmbed,
	getDefaultMaintenanceEmbed,
	commandPermissionEmbed,
	guildPermissionEmbed,
};