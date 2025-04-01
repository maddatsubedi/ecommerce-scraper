const { checkRole, checkRolesFromList } = require('../utils/helpers');
const { getConfig, getMultiValueConfig } = require('../database/models/config');
const { simpleEmbed, commandPermissionEmbed, guildPermissionEmbed } = require('../embeds/generalEmbeds');
const { guildId, otherGuilds, ownerId, otherOwners } = require('../config.json');
const { getGuildConfig } = require('../database/models/guildConfig');

// Helper functions
const isGlobalOwner = (userId) => {
    return userId === ownerId || otherOwners.includes(userId);
};

const isOwner = async (member) => {
    const ownerIds = await getMultiValueConfig('owner_ids');
    return checkRolesFromList(member, ownerIds);
};

const isServerAdmin = async (guildId, member) => {
    const adminRoleId = await getGuildConfig(guildId, 'admin_role_id');
    return checkRole(member, adminRoleId);
};

// Unified permission check
const checkPermissions = async (interaction) => {
    const command = interaction.client.commands.get(interaction.commandName);
    const userId = interaction.user.id;
    const member = interaction.member;
    
    // Get user's permissions
    const globalOwner = isGlobalOwner(userId);
    const owner = await isOwner(member);
    const admin = await isServerAdmin(interaction.guild.id, member);

    // Hierarchy checks
    if (command.isGlobalOwner && !globalOwner) {
        return {
            success: false,
            data: {
                embed: commandPermissionEmbed
            }
        };
    }

    if (command.isOwner && !globalOwner && !owner) {
        return {
            success: false,
            data: {
                embed: commandPermissionEmbed
            }
        };
    }

    if (command.isAdmin && !globalOwner && !owner && !admin) {
        return {
            success: false,
            data: {
                embed: commandPermissionEmbed
            }
        };
    }

    return { success: true };
};

const validateGuild = async (interaction) => {
    const isMainGuild = interaction.guild.id === guildId;
    const isOtherGuild = otherGuilds.includes(interaction.guild.id);
    
    if (!isMainGuild && !isOtherGuild) {
        return {
            success: false,
            data: {
                embed: guildPermissionEmbed
            }
        };
    }
    return { success: true };
};

// Combined validation
const validateRoleAndGuild = async (interaction) => {
    const guildValidation = await validateGuild(interaction);
    if (!guildValidation.success) return guildValidation;

    const permissionCheck = await checkPermissions(interaction);
    return permissionCheck;
};

module.exports = {
    validateRoleAndGuild,
    checkPermissions,
    validateGuild
};