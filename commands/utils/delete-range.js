const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField, ChannelType, PermissionFlagsBits } = require('discord.js');
const { simpleEmbed } = require('../../embeds/generalEmbeds');
const { setRange, getRangeDetails, deleteRange } = require('../../database/models/discount_range');
const { validateRange } = require('../../utils/helpers');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('delete-range')
        .setDescription('Delete a discout range to be notified of')
        .addStringOption(option =>
            option.setName('range')
                .setDescription('Discount range to be deleted')
                .setRequired(true)),
    isAdmin: true,
    async execute(interaction) {

        const range = interaction.options.getString('range');

        const isValidRange = validateRange(range);

        if (!isValidRange.valid) {
            const errorEmbed = simpleEmbed({
                description: `**❌ \u200b The range is not valid**\n\n>>> Please give range in this format: \`xx-xx\`\nfor e.g. \`10-20\`, \`50-60\``, color: 'Red'
            });
            return await interaction.reply({ embeds: [errorEmbed] });
        }

        const existingRange = getRangeDetails(range);

        if (!existingRange) {
            const errorEmbed = simpleEmbed(
                {
                    description: `❌ \u200b **The range \`${range}\` does not exist**`,
                    color: 'Red',
                }
            )
            return await interaction.reply({ embeds: [errorEmbed] });
        }

        const { roleID } = existingRange;

        deleteRange(range);

        // return await interaction.reply({ content: `Range added: ${range}` });
        const embed = simpleEmbed(
            {
                title: `Range \`${range}\` Deleted`,
                description: `which had following configurations`,
                color: 'Red',
                footer: 'Config',
            }
        ).addFields(
            { name: 'Range', value: `\`${range}\``, inline: true },
            { name: 'Role', value: `<@&${roleID}>`, inline: true },
        );

        return await interaction.reply({ embeds: [embed] });

    },
};