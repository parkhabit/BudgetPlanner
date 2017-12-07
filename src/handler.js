const fs = require('fs');
const path = require('path');
const querystring = require('querystring');
// const { parse } = require('cookie');
const { sign, verify } = require('jsonwebtoken');
const checkUser = require('./queries/check_user');
const createUser = require('./queries/create_user');
const setNewItem = require('./queries/set_new_item');
const getCostsPerPerson = require('./queries/get_costs_per_person');
const unpaidItems = require('./queries/unpaid_items.js');
const markAsPaid = require('./queries/mark_as_paid');
const { validateUser, genHashedPassword, comparePasswords } = require('./logic');

const homeHandler = (request, response) => {
    fs.readFile(path.join(__dirname, '..', 'public', 'index.html'), 'utf8', (err, file) => {
        if (err) {
            response.writeHead(500, {
                'content-type': 'text/plain'
            })
            response.end('Server error');
        } else {
            response.writeHead(200, {
                'content-type': 'text/html'
            })
            response.end(file);
        };

    })
};

const staticFileHandler = (request, response, endpoint) => {
    const extensionType = {
        html: 'text/html',
        css: 'text/css',
        js: 'application/javascript',
    }
    const extension = endpoint.split('.')[1];
    const filePath = path.join(__dirname, '..', endpoint);
    fs.readFile(filePath, (err, file) => {
        if (err) response.end('error');
        response.writeHead(200, 'Content-Type: ' + extensionType[extension]);
        response.end(file);
    })
};

const signUpHandler = (request, response) => {

  let allTheData = '';
  request.on('data', (chunckOfData) => {
      allTheData += chunckOfData;
  });
  request.on('end', () => {
      const userData = JSON.parse(allTheData);


  if(validateUser(userData)){
      checkUser(userData, (err, res) => {
          if (err) {
            response.writeHead(500, { 'content-type': 'text/html'});
            response.end('Oops! There was a problem');
          } else if (res === 1){
              response.writeHead(401, { 'content-type': 'text/html' })
              response.end(`username: ${userData.username} already exists, try logging in`);
          } else if (res === 0){
              genHashedPassword(userData, (err, result) => {
                if (err){
                  response.writeHead(500, { 'content-type': 'text/html'});
                  response.end('Oops! There was a problem');
                } else {
                    createUser(result, (err, res) => {
                        if (err) {
                          response.writeHead(500, { 'content-type': 'text/html'});
                          response.end('Oops! There was a problem');
                        } else {
                          let stringed = (JSON.stringify(res));
                          stringed = JSON.parse(stringed)[0];
                          console.log(stringed);
                          const cookie = sign(stringed, SECRET);
                            response.writeHead(302,{'Location': '/','Set-Cookie': `jwt=${cookie}; HttpOnly`});
                            response.end('You have succesfully signed in');
                      }
                    });
                  }
              });
            }
        });
    } else {
      let error = validateUser(userData).message;
      response.writeHead(401, { 'content-type': 'text/html' })
      response.end(error);
    }
  }
)
}

// signUpHandler();

const loginHandler = (request, response, endpoint) => {
  let allTheData = '';
  request.on('data', (chunckOfData) => {
      allTheData += chunckOfData;
  });
  request.on('end', () => {
      const userData = JSON.parse(allTheData);

    //validate & hash here
    checkUser(userData, (err, res) => {
        if (err) console.log(err)
        if (res === 0) {
          res.writeHead(202, { 'content-type': 'text/html' })
          res.end(`username: ${userData.username} doesn\'t exist, please sign up`);
        } else if (res !== 0) {
          getPassword(userData, (err, res) => {
            if (err) console.log(err)
          })
        }
      })
    })
  }


const addItemHandler = (request, response, endpoint) => {
    let allTheData = '';
    request.on('data', (chunckOfData) => {
        allTheData += chunckOfData;
    });
    request.on('end', () => {
        const newItem = JSON.parse(allTheData);
        console.log(newItem);
        setNewItem(newItem, (err, res) => {
            if (err) console.log(err)
            response.writeHead(200, { 'content-type': 'application/json' })
            response.writeHead(200, { 'location': '/' })
            response.end(JSON.stringify(res));
            })
        })
  }


const sumAllHandler = (request, response) => {
    getCostsPerPerson((err, res) => {
        if (err) console.log(err)
          response.writeHead(200, { 'content-type': 'application/json' })
          response.end(JSON.stringify(res));
        markAsPaid((err, res) => {
          if(err) console.log(err);
            response.writeHead(200, { 'content-type': 'text/html' })
            response.end('All items paid.');
        });
    })
}


const displayItemsHandler = (request, response) => {
    unpaidItems((err, res) => {
        if (err) console.log(err)
        response.writeHead(200, { 'content-type': 'application/json' })
        response.end(JSON.stringify(res));
    })
}

const logoutHandler = (request, response) => {

}

module.exports = { homeHandler, staticFileHandler, signUpHandler, loginHandler, logoutHandler, addItemHandler, sumAllHandler, displayItemsHandler}
