const express = require('express');
const router = express.Router();

const passport = require('passport');
const mongoose = require('mongoose');
const User = mongoose.model('user');
const News = mongoose.model('news');
const bCrypt = require('bcrypt-nodejs');
const bodyParser = require('body-parser');
const uuidv4 = require('uuid/v4');
const formidable = require('formidable');
const fs = require('fs');
const path = require('path');

const SetCookie = (res, data) => {
  res.cookie('access_token', data, {
    //TODO change maxAge
    httpOnly: false,
    expires: new Date(Date.now() + 2 * 604800000),
    path: '/'
  });
};

const createHash = function(password) {
  return bCrypt.hashSync(password, bCrypt.genSaltSync(10), null);
};

const isValidPassword = function(user, password) {
  return bCrypt.compareSync(password, user.password);
};

const userToResObj = function(user) {
  return {
    id: user._id,
    username: user.username,
    password: user.password,
    surName: user.surName,
    firstName: user.firstName,
    middleName: user.middleName,
    image: user.image,
    permission: user.permission,
    permissionId: user.permissionId,
    access_token: user.access_token,
  }
}

const usersArrayToResObj = function(users) {
  return users.map((elem) => userToResObj(elem));
}

const newsToResObj = async function (news) {
  const oneNews = await User.findById(news.userId)
  .then(user => {
    return {
      id: news._id,
      text: news.text,
      theme: news.theme,
      date: news.date,
      user: userToResObj(user)
    };
  })
  .catch(err => {
    return {
      id: news._id,
      text: news.text,
      theme: news.theme,
      date: news.date,
      user: null
    };
  })
  return oneNews;
}

const newsArrayToResObj = function(news) {
  const arrayNews = news.map((elem) => newsToResObj(elem));
  return Promise.all(arrayNews);
}

function checkPermissions(req, res, next){
  console.log('checkPermissions', req.path);
  if(req.isAuthenticated()){
    let isTrue = false;
    const rout = req.path.substr(0, req.path.indexOf('/', 1) >0 ? req.path.indexOf('/', 1) : req.path.length);
    const id = req.path.substr(req.path.indexOf('/', 1) + 1, req.path.length);
    switch (rout) {
      case '/saveNewUser': isTrue = req.user.permission.setting.C; break;
      case '/updateUser': isTrue = req.user.permission.setting.U || id == req.user._id; break;
      case '/deleteUser': isTrue = req.user.permission.setting.D; break;
      case '/saveUserImage': isTrue = req.user.permission.setting.U || id == req.user._id; break;
      case '/updateUserPermission': isTrue = req.user.permission.setting.U; break;
      case '/getUsers': isTrue = req.user.permission.setting.R; break;
      case '/getNews': isTrue = req.user.permission.news.R; break;
      case '/newNews': isTrue = req.user.permission.news.C; break;
      case '/updateNews': isTrue = req.user.permission.news.U; break;
      case '/deleteNews': isTrue = req.user.permission.news.D; break;
    }
    if (isTrue) {
      next();
    } else{
      console.error('403 У вас нет прав на эту операцию!');
      res.status(403);
      return res.json({error:'У вас нет прав на эту операцию!'});
    }
  } else{
    console.error('401 Вы не авторизованы!');
    res.status(401);
    return res.json({error:'Вы не авторизованы!'});
  }
}

router.post('/saveNewUser', (req, res, next) => {
  User.findOne({ username: req.body.username })
  .then(user => {
    if (user) {
      res.status(400);
      return res.json({error:'Пользователь с таким логином уже существует'});
    } else {
      const newUser = new User({
        username: req.body.username,
        password: createHash(req.body.password),
        surName: req.body.surName,
        firstName: req.body.firstName,
        middleName: req.body.middleName,
        image: req.body.image,
        permission: req.body.permission,
        permissionId: uuidv4(),
        access_token: uuidv4(),
      });
      newUser
      .save()
      .then(user => {
        req.logIn(user, err => {
          if (err) {
            return next(err);
          }
          return res.json(userToResObj(user));
        });
      })
      .catch(next);
    }
  })
  .catch(next);
});

router.post('/login', (req, res, next) => {
  passport.authenticate('loginUsers', (err, user) => {
    if (err) {
      return next(err);
    }
    if (!user) {
      res.status(400);
      return res.json({error:'Укажите правильный логин и пароль!'});
    }
    if (req.body.remembered) {
      SetCookie(res, user.access_token);
    }
    req.login(user, err => {
      if (err) {
        return next(err);
      }
      return res.json(userToResObj(user));
    });
  })(req, res, next);
});

router.post('/authFromToken', (req, res, next) => {
  User.findOne({ access_token: req.body.access_token })
  .then(user => {
    if (!user) {
      res.status(400);
      return res.json({error:'Пользователя с таким токеном не существует!'});
    }
    req.logIn(user, err => {
      if (err) {
        return next(err);
      }
      return res.json(userToResObj(user));
    });
  })
  .catch(next);
});

router.put('/updateUser/:id', checkPermissions, (req, res, next) => {
  const id = req.params.id;
  User.findById(id)
  .then(user => {
    if (!user) {
      res.status(400);
      return res.json({error:'Пользователя с таким id не существует!'});
    }
    if (req.body.oldPassword && req.body.password) {
      if (isValidPassword(user, req.body.oldPassword)) {
        user.password = createHash(req.body.password);
      } else {
        res.status(400);
        return res.json({error:'Неверный пароль!'});
      }
    }
    Object.keys(req.body).forEach(key => {
      if (key !== 'id' && key !== 'oldPassword' && key !== 'password' && key !== 'image') user[key] = req.body[key];
    });
    user
    .save()
    .then(user => {
      return res.json(userToResObj(user));
    })
    .catch(next);
  })
  .catch(next);
});

router.delete('/deleteUser/:id', checkPermissions, (req, res, next) => {
  const id = req.params.id;
  User.findByIdAndRemove(id)
  .then(result => {
    console.log('!!!deleteUser result', result);
    News.remove({userId: result._id})
    .then(res => {
      fs.unlinkSync(path.join(process.cwd(), './public', result.image));
      return res.json({message: 'Пользователь удален!'});
    })
    .catch(next);
  })
  .catch(next);
})

router.post('/saveUserImage/:id', checkPermissions, (req,res,next) =>{
  let form = new formidable.IncomingForm();
  const id = req.params.id;
  User.findById(id)
  .then(user => {
    let upload = path.join('./public', 'upload');
    let fileName;
    if (!fs.existsSync(upload)) {
      fs.mkdirSync(upload);
    }
    
    form.uploadDir = path.join(process.cwd(), upload);
    form.parse(req, function (err, fields, files) {
      if (err) {
        console.error('!!!saveUserImage form.parse', err);
        return next(err);
      }

      if (files[id].name === '' || files[id].size === 0) {
        res.status(400);
        return res.json({error:'Не загружена картинка!'});
      }

      fileName = path.join(upload, files[id].name);

      fs.rename(files[id].path, fileName, function (err) {
        if (err) {
          console.error(err);
          fs.unlink(fileName);
          fs.rename(files[id].path, fileName);
        }
        let dir = fileName.substr(fileName.indexOf('\\'));
        user.image = dir;
        user.save()
        .then(user => {
          return res.json({path: user.image});
        })
        .catch(next);
      });
    })
  })
  .catch(err => {
    res.status(400);
    return res.json({error:'Пользователь не найден!'});
  });
})

router.put('/updateUserPermission/:id', checkPermissions, (req, res, next) => {
  const id = req.params.id;
  User.findOne({permissionId: id})
  .then(user => {
    if (!user) {
      res.status(400);
      return res.json({error:'Пользователя с таким id не существует!'});
    }
    user.permission = {
      chat: {... user.permission.chat, ...req.body.permission.chat}, 
      news: {... user.permission.news, ...req.body.permission.news}, 
      setting: {... user.permission.setting, ...req.body.permission.setting}, 
    };
    user.save()
    .then(user => {
      return res.json(userToResObj(user));
    })
    .catch(err => {
      next(err);
    });
  })
  .catch(next);
});

router.get('/getUsers', checkPermissions, (req, res, next) => {
  User.find({})
  .then(result => {
    return res.json(usersArrayToResObj(result));
  })
  .catch(next);
})

router.get('/getNews', checkPermissions, (req, res, next) => {
  News.find({})
  .then(result => {
    if (result.length) {
      newsArrayToResObj(result)
      .then(values => {
        return res.json(values);
      })
      .catch(next);
    }
    else return res.json([]);
  })
  .catch(next);
})

router.post('/newNews', checkPermissions, (req, res, next) => {
  const newNews = new News({
    date: req.body.date,
    text: req.body.text,
    theme: req.body.theme,
    userId: req.body.userId,
  });
  newNews.save()
  .then(news => {
    News.find({})
    .then(result => {
      newsArrayToResObj(result)
      .then(values => {
        return res.json(values);
      });
    })
    .catch(next);
  })
  .catch(next);
})

router.put('/updateNews/:id', checkPermissions, (req, res, next) => {
  const id = req.params.id;
  News.findById(id)
  .then(news => {
    Object.keys(req.body).forEach(key => {
      if (key !== 'id') news[key] = req.body[key];
    });
    news
    .save()
    .then(news => {
      News.find({})
      .then(result => {
        newsArrayToResObj(result)
        .then(values => {
          return res.json(values);
        });
      })
      .catch(next);
    })
    .catch(next);
  })
  .catch(next);
})

router.delete('/deleteNews/:id', checkPermissions, (req, res, next) => {
  const id = req.params.id;
  News.findByIdAndRemove(id)
  .then(news => {
    News
    .find({})
    .then(result => {
      newsArrayToResObj(result)
      .then(values => {
        return res.json(values);
      });
    })
    .catch(next);
  })
  .catch(next);
})

module.exports = router;
