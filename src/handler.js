const fs = require('fs');
const path = require('path');
const querystring = require('querystring');
const cookieModule = require('cookie');
const { sign, verify, decode } = require('jsonwebtoken');
const checkUser = require('./queries/check_user');
const createUser = require('./queries/create_user');
const setNewItem = require('./queries/set_new_item');
const getCostsPerPerson = require('./queries/get_costs_per_person');
const unpaidItems = require('./queries/unpaid_items.js');
const markAsPaid = require('./queries/mark_as_paid');
const getPassword = require('./queries/get_password');
const getUserId = require('./queries/get_user_id');
const { validateUser, genHashedPassword, comparePasswords, calcAverages } = require('./logic');

const homeHandler = (request, response) => {
    if (request.headers.cookie) {
        let cookies = cookieModule.parse(request.headers.cookie);
        verify(cookies.jwt, process.env.SECRET, function(err, decoded) {
            if (err) {
                response.writeHead(302, { 'Location': '/', 'Set-Cookie': 'jwt=0; Max-Age=0' });
                response.end();
            } else {
                response.writeHead(302, { 'Location': '/main' });
                response.end();
            }
        });
    } else {
        fs.readFile(path.join(__dirname, '..', 'public', 'login.html'), 'utf8', (err, file) => {
            if (err) {
                response.writeHead(500, { 'content-type': 'text/plain' })
                response.end('Oops! There was a problem');
            } else {
                response.writeHead(200, { 'content-type': 'text/html' })
                response.end(file);
            };

        })
    }
};


const mainPageHandler = (request, response) => {
    if (request.headers.cookie) {
        let cookies = cookieModule.parse(request.headers.cookie);
        verify(cookies.jwt, process.env.SECRET, function(err, decoded) {
            if (err) {
                response.writeHead(500, { 'content-type': 'text/plain' })
                response.end('Oops! There was a problem');
            } else {
                fs.readFile(path.join(__dirname, '..', 'public', 'index.html'), 'utf8', (err, file) => {
                    if (err) {
                        response.writeHead(500, { 'content-type': 'text/plain' })
                        response.end('Oops! There was a problem');
                    } else {
                        response.writeHead(200, { 'content-type': 'text/html', 'Username': decoded.user_name })
                        response.end(file);
                    };

                })
            }
        });
    } else {
        response.writeHead(302, { 'Location': '/', 'Set-Cookie': 'jwt=0; Max-Age=0' });
        response.end();
    }

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
        if (err) {
            response.writeHead(500, {
                'content-type': 'text/plain'
            })
            response.end('Server error');
        } else {
            response.writeHead(200, 'Content-Type: ' + extensionType[extension]);
            response.end(file);
        }
    })
};

const signUpHandler = (request, response) => {
    let allTheData = '';
    request.on('data', (chunckOfData) => {
        allTheData += chunckOfData;
    });
    request.on('end', () => {
        const userData = querystring.parse(JSON.parse(JSON.stringify(allTheData)));
        if (validateUser(userData) === true) {
            checkUser(userData, (err, res) => {
                if (err) {
                    response.writeHead(500, { 'content-type': 'text/html' });
                    response.end('Oops! There was a problem');
                } else if (res === 1) {
                    response.writeHead(401, { 'content-type': 'text/html' })
                    response.end(`Username: ${userData.username} already exists, try logging in`);
                } else if (res === 0) {
                    genHashedPassword(userData, (err, result) => {
                        if (err) {
                            response.writeHead(500, { 'content-type': 'text/html' });
                            response.end('Oops! There was a problem');
                        } else {
                            createUser(result, (err, res) => {
                                if (err) {
                                    response.writeHead(500, { 'content-type': 'text/html' });
                                    response.end('Oops! There was a problem');
                                } else {
                                    let userIdName = JSON.parse(res);
                                    const cookie = sign(userIdName, process.env.SECRET);
                                    response.writeHead(302, { 'Location': '/main', 'Set-Cookie': `jwt=${cookie}; HttpOnly` });
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
    })
}

const loginHandler = (request, response) => {
    let allTheData = '';
    request.on('data', (chunckOfData) => {
        allTheData += chunckOfData;
    });
    request.on('end', () => {
        const userData = querystring.parse(JSON.parse(JSON.stringify(allTheData)));
        if (validateUser(userData) === true) {
            checkUser(userData, (err, res) => {
                if (err) {
                    response.writeHead(500, { 'content-type': 'text/html' });
                    response.end('Oops! There was a problem');
                } else if (res === 0) {
                    response.writeHead(401, { 'content-type': 'text/html' })
                    response.end(`Username: ${userData.username} doesn't exist, please sign up`);
                } else if (res === 1) {
                    getPassword(userData, (err, res) => {
                        if (err) {
                            response.writeHead(500, { 'content-type': 'text/html' });
                            response.end('Oops! There was a problem');
                        } else {
                            comparePasswords(userData, res, (err, res) => {
                                if (err) {
                                    response.writeHead(500, { 'content-type': 'text/html' });
                                    response.end('Oops! There was a problem');
                                } else {
                                    if (res === false) {
                                        response.writeHead(401, { 'content-type': 'text/html' })
                                        response.end(`Password is incorrect, please try again or sign up`);
                                    }
                                    if (res === true) {
                                        getUserId(userData, (err, res) => {
                                            if (err) {
                                                response.writeHead(500, { 'content-type': 'text/html' });
                                                response.end('Oops! There was a problem');
                                            } else {
                                                let userIdName = JSON.parse(res);
                                                const cookie = sign(userIdName, process.env.SECRET);
                                                response.writeHead(302, { 'Location': 'main', 'Set-Cookie': `jwt=${cookie}; HttpOnly` });
                                                response.end('You have succesfully signed in');
                                            }
                                        })
                                    }
                                }
                            })
                        }
                    })

                }
            })
        } else {
            let error = validateUser(userData).message;
            response.writeHead(401, { 'content-type': 'text/html' })
            response.end(error);
        }
    })
}



const addItemHandler = (request, response) => {
    let allTheData = '';
    request.on('data', (chunckOfData) => {
        allTheData += chunckOfData;
    });
    request.on('end', () => {
        const newItem = JSON.parse(allTheData);
        let cookies = cookieModule.parse(request.headers.cookie);
        let decoded = decode(cookies.jwt);

        let itemObj = {
            userId: decoded.id,
            cost: newItem.cost,
            category: newItem.category,
            date: newItem.date
        }

        setNewItem(itemObj, (err, res) => {
            if (err) {
                response.writeHead(500, { 'content-type': 'text/html' });
                response.end('Oops! There was a problem');
            } else {
                response.writeHead(200, { 'content-type': 'application/json' })
                response.writeHead(200, { 'location': 'main' })
                response.end(JSON.stringify(res));
            }

        })
    })
}


const sumAllHandler = (request, response) => {
    getCostsPerPerson((err, res) => {
        if (err) {
            response.writeHead(500, { 'content-type': 'text/html' });
            response.end('Oops! There was a problem');
        } else {
            response.writeHead(200, { 'content-type': 'application/json' })
            response.writeHead(200, { 'location': 'main' })
            response.end(JSON.stringify(res));
        }
        response.writeHead(200, { 'content-type': 'application/json' })
        let summedCosts = calcAverages(res)
        response.end(JSON.stringify(summedCosts));
        markAsPaid((err, res) => {
            if (err) {
                response.writeHead(500, { 'content-type': 'text/html' });
                response.end('Oops! There was a problem');
            } else {
                response.writeHead(200, { 'content-type': 'text/html' })
                response.end('All items paid.');
            }
        });
    })
}


const displayItemsHandler = (request, response) => {
    unpaidItems((err, res) => {
        if (err) {
            response.writeHead(500, { 'content-type': 'text/html' });
            response.end('Oops! There was a problem');
        } else {
            response.writeHead(200, { 'content-type': 'application/json' })
            response.end(JSON.stringify(res));
        }
    })
}

const logoutHandler = (request, response) => {
    response.writeHead(201, { 'location': '/', 'Set-Cookie': 'jwt=0; Max-Age=0' });
    response.end('working');
}

const displayUsernameHandler = (request, response) => {
    if (request.headers.cookie) {
        let cookies = cookieModule.parse(request.headers.cookie);
        verify(cookies.jwt, process.env.SECRET, function(err, decoded) {
            if (err) {
                response.writeHead(500, { 'content-type': 'text/plain' })
                response.end('Oops! There was a problem');
            } else {
                response.end(JSON.stringify(decoded.user_name));
            }
        });
    } else {
        response.writeHead(302, { 'Location': '/', 'Set-Cookie': 'jwt=0; Max-Age=0' });
        response.end();
    }
}

module.exports = {
    homeHandler,
    mainPageHandler,
    staticFileHandler,
    signUpHandler,
    loginHandler,
    logoutHandler,
    addItemHandler,
    sumAllHandler,
    displayItemsHandler,
    displayUsernameHandler
}
