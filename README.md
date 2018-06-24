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
git clone https://github.com/MicroPad/Electron
cd Electron
yarn
yarn update-core
yarn dist
```

You will now find binaries for the app in `Electron/dist`.

### Windows
#### Build the core
```Batchfile
git clone --depth=1 https://github.com/MicroPad/Web.git
cd Web
cd app
npm ci
npm run build
```

#### Get the Electron code
```Batchfile
git clone https://github.com/MicroPad/Electron
cd Electron
yarn
mkdir core
```

You will now need to copy the contents of `Web\app\build`  into `Electron\core`.

#### Build the Windows app
```Batchfile
yarn build
npx electron-builder
```

You will now find binaries for the app in `Electron\dist`.