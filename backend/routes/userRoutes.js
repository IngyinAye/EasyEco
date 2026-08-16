const express = require('express');
const router = express.Router();

const {
  registerUser,
  loginUser,
  requestPasswordReset,
  getProfile,
  updateProfile,
  changePassword,
  requestPasswordResetOtp,
  verifyResetOtp,
  resetPassword,
  googleLogin,
  facebookLogin,
} = require('../controllers/userController');
const requireAuth = require('../middleware/requireAuth');
const {
  setMonthlyBudget,
  getMonthlyBudget,
} = require('../controllers/userController');

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/request-password-reset', requestPasswordReset);
router.post('/request-password-reset-otp', requestPasswordResetOtp);
router.get('/profile', requireAuth, getProfile);
router.put('/profile', requireAuth, updateProfile);
router.put('/change-password', requireAuth, changePassword);
router.post('/verify-reset-otp', verifyResetOtp);
router.post('/reset-password', resetPassword);

router.post('/google-login', googleLogin);
router.post('/facebook-login', facebookLogin);
router.post('/budget', requireAuth, setMonthlyBudget);
router.get('/budget', requireAuth, getMonthlyBudget);

module.exports = router;
