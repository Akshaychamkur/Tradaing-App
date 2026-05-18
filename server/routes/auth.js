import express from "express";

import  {login, logout, refreshToken, register} from '../controllers/auth/auth'
import authenticateUser from "../middleware/authentication";

const router = express.Router();

router.post("/refresh-token", refreshToken);
router.post("/login", authenticateUser,login);
router.post("/register", register);
router.post("/logout", logout);

export default router;