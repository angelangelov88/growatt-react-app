import callback from "../_handlers/auth/callback";
import confirm from "../_handlers/auth/confirm";
import google from "../_handlers/auth/google";
import login from "../_handlers/auth/login";
import logout from "../_handlers/auth/logout";
import me from "../_handlers/auth/me";
import mfa from "../_handlers/auth/mfa";
import password from "../_handlers/auth/password";
import signup from "../_handlers/auth/signup";
import { createRouter } from "../_lib/router";

// /api/auth/<action>. Each endpoint's code is in api/_handlers/auth/.
export default createRouter({
  callback,
  confirm,
  google,
  login,
  logout,
  me,
  mfa,
  password,
  signup,
});
