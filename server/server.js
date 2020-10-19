import express from 'express';
import path from 'path';
import cors from 'cors';
import bodyParser from 'body-parser';
import sockjs from 'sockjs';
import { renderToStaticNodeStream } from 'react-dom/server';
import React from 'react';
import axios from 'axios';
import cookieParser from 'cookie-parser';
import config from './config';
import Html from '../client/html';
import { readFile, checkFile, createFile, deleteFile } from './helpers';

const Root = () => '';

try {
  // eslint-disable-next-line import/no-unresolved
  // ;(async () => {
  //   const items = await import('../dist/assets/js/root.bundle')
  //   console.log(JSON.stringify(items))

  //   Root = (props) => <items.Root {...props} />
  //   console.log(JSON.stringify(items.Root))
  // })()
  console.log(Root);
} catch (ex) {
  console.log(' run yarn build:prod to enable ssr');
}

let connections = [];

const port = process.env.PORT || 8090;
const server = express();

const middleware = [
  cors(),
  express.static(path.resolve(__dirname, '../dist/assets')),
  bodyParser.urlencoded({ limit: '50mb', extended: true, parameterLimit: 50000 }),
  bodyParser.json({ limit: '50mb', extended: true }),
  cookieParser()
];

middleware.forEach((it) => server.use(it));

server.use((req, res, next) => {
  res.set('x-skillcrucial-user', '704f0f02-7aa0-4314-8b60-52099d050c4a');
  res.set('Access-Control-Expose-Headers', 'X-SKILLCRUCIAL-USER');
  next();
});

// server.use('/api/', (req, res) => {
//   res.status(404)
//   res.end()
// })

// Route to get users form file users.json or if not exists to get users from jsonplaceholder and write them to file users.json
server.get('/api/v1/users', async (req, res) => {
  console.log('hello');
  if (await checkFile('users.json')) {
    console.log('Requested file found');
    const users = JSON.parse(await readFile('users.json'));
    res.json(users);
  } else {
    console.log('Requested file NOTE found');
    const { data: users } = await axios('https://jsonplaceholder.typicode.com/users');
    await createFile('users.json', JSON.stringify(users));
    res.json(users);
  }
});
// Route to post one additional user to fail users.json and save with id = id of last plus 1
server.post('/api/v1/users', async (req, res) => {
  let users = [];
  if (await checkFile('users.json')) {
    console.log('Found file');
    users = JSON.parse(await readFile('users.json'));
  }
  console.log('REQ', req.body);
  const newUser = {
    id: users.length + 1,
    ...req.body
  };
  users.push(newUser);
  await createFile('users.json', JSON.stringify(users));
  res.json({ status: 'success', id: newUser.id });
});

// Route to change user information of user with id=userID (using patch)
server.patch('/api/v1/users/:userId', async (req, res) => {
  if (await checkFile('users.json')) {
    console.log('Requested file was found');
    const updUser = req.body;
    const users = JSON.parse(await readFile('users.json'));
    let userIndex = null;
    users.forEach((user, index) => {
      if (user.id === parseInt(req.params.userId, 10)) {
        userIndex = index;
      }
    });
    if (userIndex === null) {
      res.status(404).json({ msg: 'User not found' });
    } else {
      users[userIndex] = { ...users[userIndex], ...updUser };
      await createFile('users.json', JSON.stringify(users));
      res.json({ status: 'success', id: req.params.userId });
    }
  } else {
    res.status(400).json({ msg: 'Requested file not found' });
  }
});

// Route to delete user with id = userId from file users.json
server.delete('/api/v1/users/:userId', async (req, res) => {
  if (await checkFile('users.json')) {
    console.log('File found');
    const users = JSON.parse(await readFile('users.json'));
    const updatedUsers = users.filter((user) => {
      return user.id !== parseInt(req.params.userId, 10);
    });
    if (users.length === updatedUsers.length) {
      res.json({ status: 'Not found userId', id: req.params.userId });
    } else {
      await createFile('users.json', JSON.stringify(updatedUsers));
      res.json({ status: 'success', id: req.params.userId });
    }
  } else {
    console.log('File not found');
    res.json({ status: 'failed to find file', id: req.params.userId });
  }
});

// Route to delete file users.json
server.delete('/api/v1/users', async (req, res) => {
  await deleteFile('users.json');
  res.json({ status: 'success' });
});

const [htmlStart, htmlEnd] = Html({
  body: 'separator',
  title: 'Skillcrucial - Become an IT HERO'
}).split('separator');

server.get('/', (req, res) => {
  const appStream = renderToStaticNodeStream(<Root location={req.url} context={{}} />);
  res.write(htmlStart);
  appStream.pipe(res, { end: false });
  appStream.on('end', () => {
    res.write(htmlEnd);
    res.end();
  });
});

server.get('/*', (req, res) => {
  console.log('hello');
  const initialState = {
    location: req.url
  };

  return res.send(
    Html({
      body: '',
      initialState
    })
  );
});

const app = server.listen(port);

if (config.isSocketsEnabled) {
  const echo = sockjs.createServer();
  echo.on('connection', (conn) => {
    connections.push(conn);
    conn.on('data', async () => {});

    conn.on('close', () => {
      connections = connections.filter((c) => c.readyState !== 3);
    });
  });
  echo.installHandlers(app, { prefix: '/ws' });
}
console.log(`Serving at http://localhost:${port}`);
