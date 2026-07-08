export type Role = "bot" | "developer";

export type PaginationEnv = {
  page: number;
  limit: number;
  offset: number;
};

export type IdentityEnv = {
  Variables: {
    userRole: Role;
    tokenGuildId?: string;
    permissionsChecked?: boolean;
    pagination?: PaginationEnv;
  };
};

export type GuildEnv = IdentityEnv & {
  Variables: {
    guildId: string;
  };
};

export type UserEnv = IdentityEnv & {
  Variables: {
    userId: string;
  };
};
