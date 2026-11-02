
// Middleware factory to allow specific user roles
const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    // Authentication must run before authorization.
    if (!req.user) {
      return res.status(401).json({
        status: "error",
        message: "Authentication required",
      });
    }

    // Check whether the user's role is allowed.
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        status: "error",
        message: "You do not have permission to access this resource",
      });
    }

    // Permission granted.
    next();
  };
};

export default authorizeRoles;
