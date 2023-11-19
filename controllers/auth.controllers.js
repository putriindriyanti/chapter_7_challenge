const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const nodemailer = require('../utils/nodemailer')
const { JWT_SECRET_KEY } = process.env;

module.exports = {
    register: async (req, res, next) => {
        try {
            let { name, email, password, password_confirmation } = req.body;
            if (password != password_confirmation) {
                return res.status(400).json({
                    status: false,
                    message: 'Bad Request',
                    err: 'please ensure that the password and password confirmation match!',
                    data: null
                });
            }

            let userExist = await prisma.user.findUnique({ where: { email } });
            if (userExist) {
                return res.status(400).json({
                    status: false,
                    message: 'Bad Request',
                    err: 'user has already been used!',
                    data: null
                });
            }

            let encryptedPassword = await bcrypt.hash(password, 10);
            let user = await prisma.user.create({
                data: {
                    name,
                    email,
                    password: encryptedPassword, 
                    notifications: {
                      create: {
                        title: `Hai ${name}!`,
                        description: "Welcome to the ProClass App!",
                      },
                    },
                }
            });

            let token = jwt.sign({ email: user.email }, JWT_SECRET_KEY);
            let url = `http://localhost:3000/api/v1/auth/email-activation?token=${token}`
            const html = await nodemailer.getHtml('activation-email.ejs',
             {name, url});
             nodemailer.sendEmail(email, 'Email Activation', html)

             res.redirect("/api/v1/users/login");
        } catch (err) {
            next(err);
        }
    },

    login: async (req, res, next) => {
        try {
          const { email, password } = req.body;
    
          const user = await prisma.user.findUnique({ where: { email } });
    
          if (!user) {
            return res.status(400).json({
              status: false,
              message: "Bad Request",
              error: "Invalid Email or Password",
            });
          }
    
          const isPasswordCorrect = await bcrypt.compare(password, user.password);
    
          if (!isPasswordCorrect) {
            return res.status(400).json({
              status: false,
              message: "Bad Request",
              error: "Invalid Email or Password",
            });
          }
    
          const token = jwt.sign({id: user.id}, JWT_SECRET_KEY);
    
          res.redirect(`/api/v1/users/dasbord?token=${token}`);
        } catch (error) {
          next(error);
        }
      },
    
    whoami: (req, res, next) => {
        return res.status(200).json({
            status: true,
            message: 'OK',
            err: null,
            data: { user: req.user }
        });
    },

    activate: (req, res) => {
        let token = req.body.token || req.query.token || req.headers['x-access-token'];
        jwt.verify(token, JWT_SECRET_KEY, async (err, decoded) => {
            if (err) {
                return res.status(400).json({
                    status: false,
                    message: 'Bad Request',
                    err: err.message,
                    data: null
                });
            }

            let updated = await prisma.user.update ({
                where: {email:decoded.email},
                data: {is_verified:true}
            })

            res.json({status:true, message:'OK', err:null, data:updated});
        })
    },

   
   forgotPassword: async (req, res, next) => {
    try {
      const { email } = req.body;
      const user = await prisma.user.findUnique({ where: { email } });

      if (!user) {
        return res.status(400).json({
          status: false,
          message: "Bad Request",
          error: "Email is not found",
        });
      }

      const token = jwt.sign({ id: user.id }, JWT_SECRET_KEY);
      let url = `http://localhost:3000/api/v1/auth/update-password?token=${token}`;
  
      const html = await nodemailer.getHtml('forgot-password.ejs', { name: user.name, url });
      await nodemailer.sendEmail(email, 'Forgot Password', html);
  
      return res.status(200).json({
        status: true,
        message: 'An email to reset your password has been sent.',
        err: null,
        data: { email }
      });
    } catch (error) {
      next(error); 
    }
  },
  

          
    updatePassword: async (req, res, next) => {
      try {
        const user = req.user;
        const { password, password_confirmation } = req.body;
    
  
        if (password !== password_confirmation) {
          return res.status(400).json({
            status: false,
            message: 'Bad Request',
            err: 'Pastikan bahwa kata sandi dan konfirmasi kata sandi cocok!',
            data: null
          });
        }
  
        let encryptedPassword = await bcrypt.hash(password, 10);
  
        let updatePassword = await prisma.user.update({
          where: { id: user.id },
          data: {
            password: encryptedPassword 
          }
        });
    
        const notifications = await prisma.notifications.create({
          data: {
            title: `Update Password`,
            description: "Password succesfull update!",
            user_id: user.id,
          },
          select: {
            title: true,
            description: true,
          },
        });
    
        req.io.emit(`notification_${user.id}`, notifications);
    
        return res.status(201).json({
          status: true,
          message: 'Password successfully updated',
          err: null,
          data: { updatePassword }
        });
      } catch (err) {
        next(err); 
      }
      
    }
  };    