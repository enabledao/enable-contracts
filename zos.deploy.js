zos push $@
zos publish $@
truffle compile
truffle exec ./zos.initialize-deploy.js $@
