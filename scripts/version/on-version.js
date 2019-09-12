const fs = require('fs');
const path = require("path");

const OZ_PROJECT_FILE = '../../.openzeppelin/project.json';
const PACKAGE_FILE = '../../package.json';

function getOZProjectConfig() {
  const filename = path.resolve(__dirname, OZ_PROJECT_FILE);
  return JSON.parse(fs.readFileSync(filename));
}

function getPackageConfig() {
  const filename = path.resolve(__dirname, PACKAGE_FILE);
  return JSON.parse(fs.readFileSync(filename));
}

function setOZProjectConfig(content) {
  const filename = path.resolve(__dirname, OZ_PROJECT_FILE);
  content = JSON.stringify(content, null, 2);
  return fs.writeFileSync(filename, content);
}

try {
  const ozConfig = getOZProjectConfig();
  const packageConfig = getPackageConfig();

  //Update version
  ozConfig.version = packageConfig.version;

  //Updadate dependencies
  Object.keys(ozConfig.dependencies).map(dependency => {
    if (packageConfig.dependencies[dependency] && packageConfig.dependencies[dependency] !== ozConfig.dependencies[dependency]) {
      ozConfig.dependencies[dependency] = packageConfig.dependencies[dependency];
    }
  })

  //Update OZ project file
  setOZProjectConfig(ozConfig);
} catch (e) {
  console.error(e);
}
process.exit();
