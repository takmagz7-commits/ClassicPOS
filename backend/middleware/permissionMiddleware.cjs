const { queryOne } = require('../db/dbService.cjs');
const { logger } = require('../utils/logger.cjs');

const checkPermission = (module, action) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ 
          error: 'Authentication required',
          message: 'You must be logged in to access this resource'
        });
      }

      const userRole = req.user.role;

      if (userRole.toLowerCase() === 'admin') {
        return next();
      }

      const permissionQuery = `
        SELECT rp.* 
        FROM role_permissions rp
        INNER JOIN permissions p ON rp.permission_id = p.id
        INNER JOIN roles r ON rp.role_id = r.id
        WHERE r.name = ? AND p.module = ? AND p.action = ?
      `;

      const permission = queryOne(permissionQuery, [userRole, module, action]);

      if (!permission) {
        return res.status(403).json({ 
          error: 'Forbidden',
          message: `You do not have permission to ${action} ${module}`
        });
      }

      next();
    } catch (error) {
      logger.error('Permission check error:', error);
      return res.status(500).json({ 
        error: 'Internal server error',
        message: 'An error occurred while checking permissions'
      });
    }
  };
};

module.exports = { checkPermission };
