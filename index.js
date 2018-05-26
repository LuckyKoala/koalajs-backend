#!/usr/bin/env node
//加载库
const express = require('express');
const cors = require('cors');
//加载数据库模块
const DB = require('./db');
//创建对象
const app = express();
const db = new DB();
//加载命令行参数
const optionDefinitions = [
  { name: 'port', alias: 'p', type: Number, defaultValue: 3000 },
  { name: 'token', alias: 't', type: String, defaultValue: 'happy coding'},
  { name: 'debug', alias: 'd', type: Boolean },
  { name: 'reset', alias: 'r', type: Boolean }
];
const options = require('command-line-args')(optionDefinitions);
if(!options.debug && options.token === 'happy coding' ) {
  console.log("You haven't set token explicily, so you should " +
              "remember that default token is 'happy coding'");
}

const corsOptions = {
    origin: 'http://localhost:3001',
    optionSuccessStatus: 200
};

app.use(cors(corsOptions));
//body-parser
app.use(express.json());
const router = express.Router();

//后台(API)
app.get('/api', function(req, res) {
    return res.json({
        "create_blog": {
            "url": "/api/blogs",
            "method": "POST"
        },
        "list_blogs": {
            "url": "/api/blogs",
            "method": "GET"
        },
        "blog_detail": {
            "url": "/api/blogs/:blog_key",
            "method": "GET"
        },
        "delete_blogs": {
            "url": "/api/blogs/:blog_key",
            "method": "DELETE"
        },
        "update_blogs": {
            "url": "/api/blogs",
            "method": "POST"
        }
    });
});

function tokenInvalid(token) {
    return !(options.debug || token === options.token);
}

router.route('/api/blogs/:key')
    .all(function(req, res, next) {
        next();
    })
    .get(function(req, res, next) {
        db.find(req.params.key)
            .then(blog => res.json(blog))
            .catch(any => res.json({'error': 'Blog not exists'}));
    })
    .post(function(req, res, next) {
        if(tokenInvalid(req.body.token)) {
            res.json({'error': 'Invalid token'});
        } else {
          db.update(req.params.key, req.body)
              .then(any => res.json({
                  'message': 'Blog updated',
                  'key': req.params.key
              }))
              //FIXME potential repressed the real error
                .catch(any => res.json({'error': 'Not Found'}));
        }
    })
    .delete(function(req, res, next) {
      if(tokenInvalid(req.body.token)) {
          res.json({'error': 'Invalid token'});
      } else {
        db.delete(req.params.key)
            .then(any => res.json({'message': 'Blog deleted'}))
              .catch(any => res.json({'error': 'Not Found'}));
      }
    })
    .put(function(req, res, next) {
        next(new Error('not implemented'));
    });

router.route('/api/blogs')
    .all(function(req, res, next) {
        next();
    })
    .get(function(req, res, next) {
        db.list()
            .then(blogs => res.json(blogs))
            .catch(console.log);
    })
    .post(function(req, res, next) {
      if(tokenInvalid(req.body.token)) {
          res.json({'error': 'Invalid token'});
      } else {
        db.new(req.body)
            .then(key => res.json({
                'message': 'New blog created',
                'key': key
            }))
            //FIXME potential repressed the real error
              .catch(any => res.json({'error': 'Not Found'}));
      }
    })
    .delete(function(req, res, next) {
        //TODO maybe delete all posts
        next(new Error('not implemented'));
    })
    .put(function(req, res, next) {
        next(new Error('not implemented'));
    });

app.use(router);

//启动服务器
if (!options['reset']) {
  db.init().then(ret => {
    //监听指定端口并输出提示语句
    app.listen(options['port'], () => console.log(`Example app listening on \
      port ${options['port']}!` ));
  }).catch(console.log);
} else {
  db.reset().then(ret => {
      //测试 文本
      const content = `
          Lorem ipsum dolor sit amet, consectetur adipisici elit, sed eiusmod tempor
          incidunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis
          nostrud exercitation ullamco laboris nisi ut aliquid ex ea commodi consequat.
          Quis aute iure reprehenderit in voluptate velit esse cillum dolore eu fugiat
          nulla pariatur. Excepteur sint obcaecat cupiditat non proident, sunt in
          culpa qui officia deserunt mollit anim id est laborum.
      `;
      //测试 文章更新
      db.new({
          title: '第一篇博客',
          content: content,
          summary: 'No summary'
      }).then(key => db.update(key, {
          title: '第一篇博客',
          content: '编辑后的内容',
          summary: 'No summary'
      }));
      db.new({
          title: '第二篇博客',
          content: content
      }).then(key => db.delete(key)); //测试 文章删除
      db.new({
          title: '第三篇博客',
          content: content
      });
      db.new({
          title: '第四篇博客',
          content: content
      });
      db.new({
          title: '第五篇博客',
          content: content
      });
      //测试 markdown文档
      db.new({
          title: 'Markdown文章',
          content: '[Blog](http://twodam.net) `hi`'
      });

      //监听指定端口并输出提示语句
      app.listen(options['port'], () => console.log(`Example app listening on \
        port ${options['port']}! \nPress Ctrl+C to stop the program.` ));
  }).catch(console.log);
}

