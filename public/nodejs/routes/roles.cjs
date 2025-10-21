const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const { getAll, getById, insert, update, query, queryOne } = require('../db/dbService.cjs');
const { roleToDb, dbToRole, permissionToDb, dbToPermission, rolePermissionToDb, dbToRolePermission } = require('../db/helpers.cjs');
const authMiddleware = require('../middleware/authMiddleware.cjs');
const { activityLogger } = require('../middleware/activityLogger.cjs');
const { z } = require('zod');

const createRoleSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
});

const createPermissionSchema = z.object({
  module: z.string().min(1),
  action: z.string().min(1),
  description: z.string().optional(),
});

const validateRequest = (schema) => (req, res, next) => {
  try {
    schema.parse(req.body);
    next();
  } catch (error) {
    return res.status(400).json({ error: 'Validation error', details: error.errors });
  }
};

router.get('/', authMiddleware, (req, res) => {
  try {
    const dbRoles = getAll('roles');
    const roles = dbRoles.map(dbToRole);
    res.json(roles);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', authMiddleware, (req, res) => {
  try {
    const dbRole = getById('roles', req.params.id);
    if (!dbRole) {
      return res.status(404).json({ error: 'Role not found' });
    }

    const role = dbToRole(dbRole);
    
    const rolePermissions = query(
      'SELECT p.* FROM permissions p INNER JOIN role_permissions rp ON p.id = rp.permission_id WHERE rp.role_id = ?',
      [req.params.id]
    );

    role.permissions = rolePermissions.map(dbToPermission);
    
    res.json(role);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', authMiddleware, activityLogger('roles'), validateRequest(createRoleSchema), (req, res) => {
  try {
    const { name, description } = req.body;

    const existingRole = queryOne('SELECT * FROM roles WHERE name = ?', [name]);
    if (existingRole) {
      return res.status(409).json({
        error: 'Role exists',
        message: 'A role with this name already exists'
      });
    }

    const newRole = {
      id: crypto.randomUUID(),
      name,
      description,
    };

    const dbRole = roleToDb(newRole);
    insert('roles', dbRole);

    res.status(201).json(newRole);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', authMiddleware, activityLogger('roles'), (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    const dbRole = getById('roles', id);
    if (!dbRole) {
      return res.status(404).json({ error: 'Role not found' });
    }

    if (name && name !== dbRole.name) {
      const existingRole = queryOne('SELECT * FROM roles WHERE name = ? AND id != ?', [name, id]);
      if (existingRole) {
        return res.status(409).json({
          error: 'Role exists',
          message: 'A role with this name already exists'
        });
      }
    }

    const updatedData = {};
    if (name) updatedData.name = name;
    if (description !== undefined) updatedData.description = description;

    update('roles', id, updatedData);

    const updatedRole = dbToRole({ ...dbRole, ...updatedData });
    res.json(updatedRole);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', authMiddleware, activityLogger('roles'), (req, res) => {
  try {
    const { id } = req.params;

    const dbRole = getById('roles', id);
    if (!dbRole) {
      return res.status(404).json({ error: 'Role not found' });
    }

    const usersWithRole = query('SELECT COUNT(*) as count FROM users WHERE role = ?', [dbRole.name]);
    if (usersWithRole[0].count > 0) {
      return res.status(400).json({
        error: 'Role in use',
        message: 'Cannot delete a role that is assigned to users'
      });
    }

    const { remove } = require('../db/dbService.cjs');
    remove('roles', id);

    res.json({ message: 'Role deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/:roleId/permissions/:permissionId', authMiddleware, activityLogger('roles', 'Assign Permission'), (req, res) => {
  try {
    const { roleId, permissionId } = req.params;

    const dbRole = getById('roles', roleId);
    if (!dbRole) {
      return res.status(404).json({ error: 'Role not found' });
    }

    const dbPermission = getById('permissions', permissionId);
    if (!dbPermission) {
      return res.status(404).json({ error: 'Permission not found' });
    }

    const existing = queryOne(
      'SELECT * FROM role_permissions WHERE role_id = ? AND permission_id = ?',
      [roleId, permissionId]
    );

    if (existing) {
      return res.status(409).json({
        error: 'Permission already assigned',
        message: 'This permission is already assigned to the role'
      });
    }

    const rolePermission = {
      id: crypto.randomUUID(),
      roleId,
      permissionId,
    };

    const dbRolePermission = rolePermissionToDb(rolePermission);
    insert('role_permissions', dbRolePermission);

    res.status(201).json(rolePermission);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:roleId/permissions/:permissionId', authMiddleware, activityLogger('roles', 'Remove Permission'), (req, res) => {
  try {
    const { roleId, permissionId } = req.params;

    const dbRolePermission = queryOne(
      'SELECT * FROM role_permissions WHERE role_id = ? AND permission_id = ?',
      [roleId, permissionId]
    );

    if (!dbRolePermission) {
      return res.status(404).json({ error: 'Role permission not found' });
    }

    const { remove } = require('../db/dbService.cjs');
    remove('role_permissions', dbRolePermission.id);

    res.json({ message: 'Permission removed from role successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/permissions/all', authMiddleware, (req, res) => {
  try {
    const dbPermissions = getAll('permissions');
    const permissions = dbPermissions.map(dbToPermission);
    res.json(permissions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/permissions', authMiddleware, activityLogger('permissions'), validateRequest(createPermissionSchema), (req, res) => {
  try {
    const { module, action, description } = req.body;

    const existingPermission = queryOne(
      'SELECT * FROM permissions WHERE module = ? AND action = ?',
      [module, action]
    );

    if (existingPermission) {
      return res.status(409).json({
        error: 'Permission exists',
        message: 'A permission with this module and action already exists'
      });
    }

    const newPermission = {
      id: crypto.randomUUID(),
      module,
      action,
      description,
    };

    const dbPermission = permissionToDb(newPermission);
    insert('permissions', dbPermission);

    res.status(201).json(newPermission);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/permissions/:id', authMiddleware, activityLogger('permissions'), (req, res) => {
  try {
    const { id } = req.params;

    const dbPermission = getById('permissions', id);
    if (!dbPermission) {
      return res.status(404).json({ error: 'Permission not found' });
    }

    const { remove } = require('../db/dbService.cjs');
    remove('permissions', id);

    res.json({ message: 'Permission deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
