const supabase = require('../utils/supabaseClient');

/**
 * Log an admin action into admin_activity_log table.
 */
async function logAdminAction(adminId, action, targetType, targetId, details) {
    try {
        await supabase.from('admin_activity_log').insert([{
            admin_id: adminId,
            admin_name: 'Admin',
            action,
            target_type: targetType || null,
            target_id: targetId || null,
            details: details || null
        }]);
    } catch (err) {
        console.error('Failed to log admin action:', err.message);
    }
}

module.exports = { logAdminAction };
