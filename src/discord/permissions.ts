import { PermissionFlagsBits, type Guild } from "discord.js";
import type { DiscordPermission, PermissionOverwriteBlueprint } from "../blueprint/schema";

const permissionMap: Record<DiscordPermission, bigint> = {
  Administrator: PermissionFlagsBits.Administrator,
  ManageGuild: PermissionFlagsBits.ManageGuild,
  ManageRoles: PermissionFlagsBits.ManageRoles,
  ManageChannels: PermissionFlagsBits.ManageChannels,
  ManageWebhooks: PermissionFlagsBits.ManageWebhooks,
  ManageMessages: PermissionFlagsBits.ManageMessages,
  ModerateMembers: PermissionFlagsBits.ModerateMembers,
  KickMembers: PermissionFlagsBits.KickMembers,
  BanMembers: PermissionFlagsBits.BanMembers,
  ViewChannel: PermissionFlagsBits.ViewChannel,
  SendMessages: PermissionFlagsBits.SendMessages,
  SendMessagesInThreads: PermissionFlagsBits.SendMessagesInThreads,
  CreatePublicThreads: PermissionFlagsBits.CreatePublicThreads,
  CreatePrivateThreads: PermissionFlagsBits.CreatePrivateThreads,
  ReadMessageHistory: PermissionFlagsBits.ReadMessageHistory,
  AddReactions: PermissionFlagsBits.AddReactions,
  MentionEveryone: PermissionFlagsBits.MentionEveryone,
  UseExternalEmojis: PermissionFlagsBits.UseExternalEmojis,
  UseExternalStickers: PermissionFlagsBits.UseExternalStickers,
  AttachFiles: PermissionFlagsBits.AttachFiles,
  EmbedLinks: PermissionFlagsBits.EmbedLinks,
  Connect: PermissionFlagsBits.Connect,
  Speak: PermissionFlagsBits.Speak,
  MuteMembers: PermissionFlagsBits.MuteMembers,
  DeafenMembers: PermissionFlagsBits.DeafenMembers,
  MoveMembers: PermissionFlagsBits.MoveMembers,
  UseVAD: PermissionFlagsBits.UseVAD,
  PrioritySpeaker: PermissionFlagsBits.PrioritySpeaker
};

export function permissionBits(permissions: DiscordPermission[]): bigint[] {
  return permissions.map((permission) => permissionMap[permission]);
}

export function permissionsValue(permissions: DiscordPermission[]): bigint {
  return permissionBits(permissions).reduce((total, permission) => total | permission, 0n);
}

export function resolveRoleId(guild: Guild, roleName: string, roleIds: Map<string, string>): string | undefined {
  if (roleName === "@everyone") {
    return guild.roles.everyone.id;
  }

  const key = roleName.toLowerCase();
  const known = roleIds.get(key);
  if (known) {
    return known;
  }

  return guild.roles.cache.find((role) => role.name.toLowerCase() === key)?.id;
}

export function resolvePermissionOverwrites(
  guild: Guild,
  overwrites: PermissionOverwriteBlueprint[],
  roleIds: Map<string, string>
) {
  return overwrites
    .map((overwrite) => {
      const id = resolveRoleId(guild, overwrite.role, roleIds);
      if (!id) {
        return undefined;
      }

      return {
        id,
        allow: permissionBits(overwrite.allow),
        deny: permissionBits(overwrite.deny)
      };
    })
    .filter((overwrite): overwrite is NonNullable<typeof overwrite> => Boolean(overwrite));
}
