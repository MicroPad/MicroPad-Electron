# µPad Electron App
This is the desktop app for [µPad](https://getmicropad.com).

## Installing
You can download binaries following the instructions [here](https://getmicropad.com/#download).

## Building
You will need the following things to build this:  
- Git
- [Node.js](https://nodejs.org) (preferably >=10.x)
- [Yarn](https://yarnpkg.com)

### Linux/MacOS
```bash
git clone https://github.com/MicroPad/MicroPad-Electron
cd Electron
yarn
yarn update-core
yarn dist
```

You will now find binaries for the app in `Electron/dist`.
