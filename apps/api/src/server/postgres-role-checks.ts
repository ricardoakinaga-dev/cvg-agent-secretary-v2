/**
 * Responsibility: verify PostgreSQL role separation — runtime least privilege,
 * migration DDL ownership and absence of superuser/BYPASSRLS drift.
 */
import { type PostgresQueryable } from '@cvg/persistence'
import {
  tenantIsolationMigrationTables,
  tenantIsolationQuarantineTables,
  tenantIsolationTables,
  webhookReplayTables
} from './tenant-isolation.ts'

export async function assertRuntimeRoleIsLeastPrivilege(
  client: PostgresQueryable,
  migrationRoleName?: string
): Promise<void> {
  const roleResult = await client.query<{
    rolname: string
    rolsuper: boolean
    rolbypassrls: boolean
    rolcreatedb: boolean
    rolcreaterole: boolean
    rolreplication: boolean
  }>(
    `SELECT rolname, rolsuper, rolbypassrls, rolcreatedb, rolcreaterole, rolreplication
     FROM pg_roles
     WHERE rolname = current_user
     LIMIT 1`
  )
  const role = roleResult.rows[0]
  if (
    !role ||
    role.rolsuper ||
    role.rolbypassrls ||
    role.rolcreatedb ||
    role.rolcreaterole ||
    role.rolreplication ||
    role.rolname === migrationRoleName
  ) {
    throw new Error(
      'PostgreSQL runtime role must satisfy least-privilege separation'
    )
  }

  const memberships = await client.query<{ granted_role: string }>(
    `WITH RECURSIVE inherited_roles(role_oid) AS (
       SELECT oid
       FROM pg_roles
       WHERE rolname = current_user
       UNION
       SELECT membership.roleid
       FROM pg_auth_members AS membership
       INNER JOIN inherited_roles AS parent ON parent.role_oid = membership.member
     )
     SELECT granted.rolname AS granted_role
     FROM inherited_roles
     INNER JOIN pg_roles AS granted ON granted.oid = inherited_roles.role_oid
     WHERE granted.rolname <> current_user`
  )
  const tablePrivileges = await client.query<{
    relname: string
    owner: string
    can_select: boolean
    can_insert: boolean
    can_update: boolean
    can_delete: boolean
    can_truncate: boolean
    can_trigger: boolean
    can_references: boolean
  }>(
    `SELECT c.relname,
            pg_get_userbyid(c.relowner) AS owner,
            has_table_privilege(current_user, format('%I.%I', n.nspname, c.relname), 'SELECT') AS can_select,
            has_table_privilege(current_user, format('%I.%I', n.nspname, c.relname), 'INSERT') AS can_insert,
            has_table_privilege(current_user, format('%I.%I', n.nspname, c.relname), 'UPDATE') AS can_update,
            has_table_privilege(current_user, format('%I.%I', n.nspname, c.relname), 'DELETE') AS can_delete,
            has_table_privilege(current_user, format('%I.%I', n.nspname, c.relname), 'TRUNCATE') AS can_truncate,
            has_table_privilege(current_user, format('%I.%I', n.nspname, c.relname), 'TRIGGER') AS can_trigger,
            has_table_privilege(current_user, format('%I.%I', n.nspname, c.relname), 'REFERENCES') AS can_references
     FROM pg_class AS c
     INNER JOIN pg_namespace AS n ON n.oid = c.relnamespace
     WHERE n.nspname = current_schema()
       AND c.relname = ANY($1::text[])`,
    [tenantIsolationTables]
  )
  const schemaPrivilege = await client.query<{ can_create: boolean }>(
    `SELECT has_schema_privilege(current_user, current_schema(), 'CREATE') AS can_create`
  )
  const quarantinePrivilege = await client.query<{
    owner: string
    can_select: boolean
    can_insert: boolean
    can_update: boolean
    can_delete: boolean
    can_truncate: boolean
  }>(
    `SELECT pg_get_userbyid(c.relowner) AS owner,
            has_table_privilege(current_user, format('%I.%I', n.nspname, c.relname), 'SELECT') AS can_select,
            has_table_privilege(current_user, format('%I.%I', n.nspname, c.relname), 'INSERT') AS can_insert,
            has_table_privilege(current_user, format('%I.%I', n.nspname, c.relname), 'UPDATE') AS can_update,
            has_table_privilege(current_user, format('%I.%I', n.nspname, c.relname), 'DELETE') AS can_delete,
            has_table_privilege(current_user, format('%I.%I', n.nspname, c.relname), 'TRUNCATE') AS can_truncate
     FROM pg_class AS c
     INNER JOIN pg_namespace AS n ON n.oid = c.relnamespace
     WHERE n.nspname = current_schema()
       AND c.relname = ANY($1::text[])`,
    [tenantIsolationQuarantineTables]
  )
  const replayPrivileges = await client.query<{
    owner: string
    can_select: boolean
    can_insert: boolean
    can_update: boolean
    can_delete: boolean
    can_truncate: boolean
    can_trigger: boolean
    can_references: boolean
  }>(
    `SELECT pg_get_userbyid(c.relowner) AS owner,
            has_table_privilege(current_user, format('%I.%I', n.nspname, c.relname), 'SELECT') AS can_select,
            has_table_privilege(current_user, format('%I.%I', n.nspname, c.relname), 'INSERT') AS can_insert,
            has_table_privilege(current_user, format('%I.%I', n.nspname, c.relname), 'UPDATE') AS can_update,
            has_table_privilege(current_user, format('%I.%I', n.nspname, c.relname), 'DELETE') AS can_delete,
            has_table_privilege(current_user, format('%I.%I', n.nspname, c.relname), 'TRUNCATE') AS can_truncate,
            has_table_privilege(current_user, format('%I.%I', n.nspname, c.relname), 'TRIGGER') AS can_trigger,
            has_table_privilege(current_user, format('%I.%I', n.nspname, c.relname), 'REFERENCES') AS can_references
     FROM pg_class AS c
     INNER JOIN pg_namespace AS n ON n.oid = c.relnamespace
     WHERE n.nspname = current_schema()
       AND c.relname = ANY($1::text[])`,
    [webhookReplayTables]
  )
  if (
    tablePrivileges.rows.length !== tenantIsolationTables.length ||
    tablePrivileges.rows.some(
      (table) =>
        table.owner === role.rolname ||
        !table.can_select ||
        !table.can_insert ||
        !table.can_update ||
        table.can_delete ||
        table.can_truncate ||
        table.can_trigger ||
        table.can_references
    ) ||
    memberships.rows.length > 0 ||
    schemaPrivilege.rows[0]?.can_create ||
    quarantinePrivilege.rows.length !==
      tenantIsolationQuarantineTables.length ||
    quarantinePrivilege.rows.some(
      (table) =>
        table.owner === role.rolname ||
        table.can_select ||
        table.can_insert ||
        table.can_update ||
        table.can_delete ||
        table.can_truncate
    ) ||
    replayPrivileges.rows.length !== webhookReplayTables.length ||
    replayPrivileges.rows.some(
      (table) =>
        table.owner === role.rolname ||
        !table.can_select ||
        !table.can_insert ||
        !table.can_update ||
        !table.can_delete ||
        table.can_truncate ||
        table.can_trigger ||
        table.can_references
    )
  ) {
    throw new Error(
      'PostgreSQL runtime role must satisfy least-privilege separation'
    )
  }
}

export async function assertMigrationRoleIsLeastPrivilege(
  client: PostgresQueryable,
  runtimeRoleName?: string
): Promise<void> {
  const roleResult = await client.query<{
    rolname: string
    rolsuper: boolean
    rolbypassrls: boolean
    rolcreatedb: boolean
    rolcreaterole: boolean
    rolreplication: boolean
  }>(
    `SELECT rolname, rolsuper, rolbypassrls, rolcreatedb, rolcreaterole, rolreplication
     FROM pg_roles
     WHERE rolname = current_user
     LIMIT 1`
  )
  const role = roleResult.rows[0]
  if (
    !role ||
    role.rolsuper ||
    role.rolbypassrls ||
    role.rolcreatedb ||
    role.rolcreaterole ||
    role.rolreplication ||
    role.rolname === runtimeRoleName
  ) {
    throw new Error(
      'PostgreSQL migration role must be a separate non-privileged DDL owner'
    )
  }

  const memberships = await client.query<{ granted_role: string }>(
    `SELECT granted.rolname AS granted_role
     FROM pg_auth_members AS membership
     INNER JOIN pg_roles AS member ON member.oid = membership.member
     INNER JOIN pg_roles AS granted ON granted.oid = membership.roleid
     WHERE member.rolname = current_user`
  )
  const databaseOwner = await client.query<{ owner: string }>(
    `SELECT pg_get_userbyid(datdba) AS owner
     FROM pg_database
     WHERE datname = current_database()`
  )
  const schemaPrivilege = await client.query<{
    can_usage: boolean
    can_create: boolean
  }>(
    `SELECT has_schema_privilege(current_user, current_schema(), 'USAGE') AS can_usage,
            has_schema_privilege(current_user, current_schema(), 'CREATE') AS can_create`
  )
  const managedTables = await client.query<{
    relname: string
    owner: string
  }>(
    `SELECT c.relname, pg_get_userbyid(c.relowner) AS owner
     FROM pg_class AS c
     INNER JOIN pg_namespace AS n ON n.oid = c.relnamespace
     WHERE n.nspname = current_schema()
       AND c.relname = ANY($1::text[])`,
    [tenantIsolationMigrationTables]
  )
  if (
    memberships.rows.length > 0 ||
    databaseOwner.rows[0]?.owner === role.rolname ||
    !schemaPrivilege.rows[0]?.can_usage ||
    !schemaPrivilege.rows[0]?.can_create ||
    managedTables.rows.length !== tenantIsolationMigrationTables.length ||
    managedTables.rows.some((table) => table.owner !== role.rolname)
  ) {
    throw new Error(
      'PostgreSQL migration role must be a separate non-privileged DDL owner'
    )
  }
}

export async function assertMigrationRoleSecurityBoundary(
  client: PostgresQueryable,
  runtimeRoleName?: string
): Promise<void> {
  const roleResult = await client.query<{
    rolname: string
    rolsuper: boolean
    rolbypassrls: boolean
    rolcreatedb: boolean
    rolcreaterole: boolean
    rolreplication: boolean
  }>(
    `SELECT rolname, rolsuper, rolbypassrls, rolcreatedb, rolcreaterole, rolreplication
     FROM pg_roles
     WHERE rolname = current_user
     LIMIT 1`
  )
  const role = roleResult.rows[0]
  const memberships = await client.query(
    `SELECT granted.rolname AS granted_role
     FROM pg_auth_members AS membership
     INNER JOIN pg_roles AS member ON member.oid = membership.member
     INNER JOIN pg_roles AS granted ON granted.oid = membership.roleid
     WHERE member.rolname = current_user`
  )
  const databaseOwner = await client.query<{ owner: string }>(
    `SELECT pg_get_userbyid(datdba) AS owner
     FROM pg_database
     WHERE datname = current_database()`
  )
  if (
    !role ||
    role.rolsuper ||
    role.rolbypassrls ||
    role.rolcreatedb ||
    role.rolcreaterole ||
    role.rolreplication ||
    role.rolname === runtimeRoleName ||
    memberships.rows.length > 0 ||
    databaseOwner.rows[0]?.owner === role.rolname
  ) {
    throw new Error(
      'PostgreSQL migration role must be a separate non-privileged DDL owner'
    )
  }
}

export async function readCurrentDatabaseRole(
  client: PostgresQueryable
): Promise<string> {
  const result = await client.query<{ role_name: string }>(
    `SELECT current_user::text AS role_name`
  )
  const roleName = result.rows[0]?.role_name
  if (!roleName) {
    throw new Error('PostgreSQL current role could not be identified')
  }
  return roleName
}

export async function assertRuntimeRoleIsNotRlsBypass(
  client: PostgresQueryable
): Promise<void> {
  const result = await client.query<{
    rolsuper: boolean
    rolbypassrls: boolean
  }>(
    `SELECT rolsuper, rolbypassrls
     FROM pg_roles
     WHERE rolname = current_user
     LIMIT 1`
  )
  const role = result.rows[0]
  if (!role || role.rolsuper || role.rolbypassrls) {
    throw new Error(
      'PostgreSQL runtime role must be a non-superuser without BYPASSRLS'
    )
  }
}
