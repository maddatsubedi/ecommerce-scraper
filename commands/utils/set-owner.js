const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField, ChannelType, PermissionFlagsBits } = require('discord.js');
const { getConfig, setConfig, deleteConfig, resetConfig, getMultiValueConfig, addMultiValueConfig } = require('../../database/models/config');
const { simpleEmbed } = require('../../embeds/generalEmbeds');
const { setGuildConfig } = require('../../database/models/guildConfig');
const { handleInteractionError } = require('../../utils/discordUtils');
const wait = require('node:timers/promises').setTimeout;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('set-owner')
        .setDescription('Set owner for the bot')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('User to set as owner')
                .setRequired(true)),
    isGlobalOwner: true,
    async execute(interaction) {

        const user = interaction.options.getUser('user');
        const userID = user.id;

        const ownerIds = await getMultiValueConfig('owner_ids', ',');

        if (!ownerIds) {
            return await handleInteractionError(interaction);
        }

        if (ownerIds.includes(userID)) {
            const embed = simpleEmbed({
                title: 'Owner Already Exists',
                description: `> <@${userID}> is already an owner`,
                color: 'Red',
                footer: `${interaction.guild.name} | Config`,
            });
            return await interaction.reply({ embeds: [embed] });
        }

        const dbResult = await addMultiValueConfig('owner_ids', userID, ',');

        if (!dbResult) {
            return await handleInteractionError(interaction);
        }

        const embed = simpleEmbed(
            {
                title: 'Owner Added',
                color: 'Random',
                footer: `${interaction.guild.name} | Config`,
            }).addFields(
                {
                    name: 'Added Owner', value: `> <@${userID}>`, inline: true
                }
            );

        return await interaction.reply({ embeds: [embed] });

    },
};