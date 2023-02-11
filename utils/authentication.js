import getUserInfo from "./userInfo.js";

export default (req, res, next) => {
  const token = req.headers['x-auth-token'];
  if (token) {
    getUserInfo(token).then((userInfo) => {
      req.userInfo = userInfo;
      next();
    }).catch((err) => {
      res.status(401).json({
        error: err.message,
      });
    });
  } else {
    res.status(401).json({
      error: 'No token provided',
    });
  }
}