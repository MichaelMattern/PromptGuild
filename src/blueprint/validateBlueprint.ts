import { z } from "zod";
import { blueprintSchema, type Blueprint } from "./schema";

export interface BlueprintValidationResult {
  valid: boolean;
  blueprint?: Blueprint;
  errors: string[];
}

function normalizedName(value: string): string {
  return value.trim().toLowerCase();
}

function collectCustomErrors(blueprint: Blueprint): string[] {
  const errors: string[] = [];
  const roleNames = new Set(blueprint.roles.map((role) => normalizedName(role.name)));
  roleNames.add("@everyone");

  const seenRoles = new Set<string>();
  for (const role of blueprint.roles) {
    const key = normalizedName(role.name);
    if (seenRoles.has(key)) {
      errors.push(`Duplicate role name: ${role.name}`);
    }
    seenRoles.add(key);

    if (role.permissions.includes("Administrator") && !["owner", "admin"].includes(key)) {
      errors.push(`Unsafe Administrator permission on non-admin role: ${role.name}`);
    }
  }

  const seenCategories = new Set<string>();
  const seenChannels = new Set<string>();

  for (const category of blueprint.categories) {
    const categoryKey = normalizedName(category.name);
    if (seenCategories.has(categoryKey)) {
      errors.push(`Duplicate category name: ${category.name}`);
    }
    seenCategories.add(categoryKey);

    for (const overwrite of category.permissions) {
      if (!roleNames.has(normalizedName(overwrite.role))) {
        errors.push(`Category ${category.name} references missing role: ${overwrite.role}`);
      }
    }

    for (const channel of category.channels) {
      const channelKey = normalizedName(channel.name);
      if (seenChannels.has(channelKey)) {
        errors.push(`Duplicate channel name: ${channel.name}`);
      }
      seenChannels.add(channelKey);

      for (const overwrite of channel.permissions) {
        if (!roleNames.has(normalizedName(overwrite.role))) {
          errors.push(`Channel ${channel.name} references missing role: ${overwrite.role}`);
        }
      }
    }
  }

  for (const rule of blueprint.automod.rules) {
    for (const role of rule.exemptRoles) {
      if (!roleNames.has(normalizedName(role))) {
        errors.push(`AutoMod rule ${rule.name} references missing exempt role: ${role}`);
      }
    }

    if (rule.logChannel && !seenChannels.has(normalizedName(rule.logChannel))) {
      errors.push(`AutoMod rule ${rule.name} references missing log channel: ${rule.logChannel}`);
    }
  }

  for (const question of blueprint.onboarding.questions) {
    for (const option of question.options) {
      if (option.role && !roleNames.has(normalizedName(option.role))) {
        errors.push(`Onboarding option ${option.label} references missing role: ${option.role}`);
      }

      for (const channel of option.channels) {
        if (!seenChannels.has(normalizedName(channel))) {
          errors.push(`Onboarding option ${option.label} references missing channel: ${channel}`);
        }
      }
    }
  }

  if (blueprint.features.premiumRoles) {
    const hasPremiumRole = blueprint.roles.some((role) => normalizedName(role.name).includes("premium"));
    if (!hasPremiumRole) {
      errors.push("features.premiumRoles is enabled but no premium role exists.");
    }
  }

  return errors;
}

export function validateBlueprint(input: unknown): BlueprintValidationResult {
  const parsed = blueprintSchema.safeParse(input);
  if (!parsed.success) {
    return {
      valid: false,
      errors: parsed.error.issues.map((issue: z.ZodIssue) => `${issue.path.join(".") || "blueprint"}: ${issue.message}`)
    };
  }

  const errors = collectCustomErrors(parsed.data);
  return {
    valid: errors.length === 0,
    blueprint: parsed.data,
    errors
  };
}

export function assertValidBlueprint(input: unknown): Blueprint {
  const result = validateBlueprint(input);
  if (!result.valid || !result.blueprint) {
    throw new Error(`Invalid blueprint:\n${result.errors.map((error) => `- ${error}`).join("\n")}`);
  }

  return result.blueprint;
}
