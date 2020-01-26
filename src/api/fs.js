// const os = require('os');

const fs = require('fs');

const path = require('path');

const { preventUnxhr } = require('../lib/util');
const { cutAndCopy } = require('./fs/moveAndCopy');
const ls = require('./fs/ls');
const createSymbolicLink = require('./fs/sym-link');
const del = require('./fs/del');
const bodyMap = {
  createSymbolicLink,
  rename,
  createFile,
  createFolder,
  checkCover,
  copy: cutAndCopy,
  cut: cutAndCopy,
  del
}

function fsSys(req, res, next){
  const method = req.method;
  req.PATH = decodeURIComponent(req.path);
  if(method === 'GET'){

    // if(preventUnxhr(req, res)){
    //   return;
    // }

    if(req.query.dir){
      if(preventUnxhr(req, res)){
        return;
      }
      ls(req, res, next);
      return;
    }else{
      fs.access(req.PATH, fs.constants.R_OK, (err) => { // Fixed: issues/185
        if(err){
          return next(err);
        }
        if(req.query.download){
          res.download(req.PATH, path.basename(req.PATH));
        } else {
          res.sendFile(req.PATH, {
            dotfiles: 'allow'
          });
        }
      });
      return;
    }
  }

  if(preventUnxhr(req, res)){
    return;
  }

  // if(method === 'DELETE'){
  //   return moveToDustbin(req, res, next);
  // }

  if(method === 'PUT'){
    return updateFile(req, res, next);
  }

  if(method === 'POST'){
    const ctrl = bodyMap[req.body.type || req.query.type];
    if(ctrl){
      return ctrl(req, res, next);
    }
  }

  next();
}

function checkCover(req, res, next){
  fs.readdir(req.PATH, function(err, files){
    if(err){
      return next(err);
    }
    const map = Object.create(null)
    const fileList = req.body.fileList;
    fileList.forEach(name => {
      map[name] = true;
    })
    const covered = [];
    files.forEach(filename => {
      if(map[filename]){
        covered.push(filename)
      }
    });
    res.json(covered);
  })
}



function rename(req, res, next){
  const {oldName, newName} = req.body;
  const oldPath = path.join(req.PATH, oldName);
  const newPath = path.join(req.PATH, newName);
  fs.rename(oldPath, newPath, function(err){
    if(err) {
      return next(err);
    }
    res.end('ok');
  })
}


function createFolder(req, res, next){
  const _path = path.join(req.PATH, req.body.name);
  fs.mkdir(_path, err => {
    if(err){
      return next(err);
    }

    req._cmd_ls_opts = {
      self: req.body.name
    }
    ls(req, res, next);

  })
}

function updateFile(req, res, next){
  //const _path = path.join(req.PATH, req.body.name);
  fs.writeFile(req.PATH, req.body.text, err => {
    if(err){
      return next(err);
    }
    const parsedPath = path.parse(req.PATH);
    req._cmd_ls_opts = {
      self: parsedPath.base,
      cwd: parsedPath.dir
    }
    ls(req, res, next);
  });
}

function createFile(req, res, next){
  const filePath = path.join(req.PATH, req.body.name);
  fs.writeFile(filePath, req.body.content || '', {
    flag: 'wx'
  }, err => {
    if(err){
      return next(err);
    }

    req._cmd_ls_opts = {
      self: req.body.name
    }
    ls(req, res, next);
  });
}


module.exports = fsSys;