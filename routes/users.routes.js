const router = require('express').Router();
const { register, login, whoami, activate, forgotPassword, updatePassword } = require('../controllers/auth.controllers');
const { restrict } = require('../middlewares/auth.middlewares');


router.get("/login", (req, res) => {
    res.render("login");
  });



  router.get("/forgot-password", (req, res) => {
    res.render("forgot-password");
  });
  
  router.get("/dasbord", restrict, (req, res) => {
    res.render("dasbord", { user:req.user});
  });
  

  router.get("/register",  (req, res) => {
    res.render("register");
  });

  
  router.get("/send-email-forgot-password",  (req, res) => {
    res.render("send-email-forgot-password");
  });


router.get('/update-password', (req, res) => {
  let {token} = req.query;
    res.render('update-password', { token })
});


  
  
  





module.exports = router;
